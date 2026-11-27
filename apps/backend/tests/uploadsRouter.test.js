const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApp } = require("../src/app");
const { detectImageType } = require("../src/routes/uploadsRouter");

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const GIF87A_BYTES = Buffer.concat([Buffer.from("GIF87a", "ascii"), Buffer.from([0x01, 0x00])]);
const GIF89A_BYTES = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.from([0x01, 0x00])]);
const WEBP_BYTES = Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    Buffer.from([0x24, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP", "ascii"),
    Buffer.from("VP8 ", "ascii")
]);

function createMockVideogameRepository() {
    return {
        async findPublicVideogames() {
            return [];
        },
        async findPublicVideogameFilters() {
            return { genres: [], platforms: [] };
        },
        async findPublicVideogameById() {
            return null;
        },
        async findRelatedCommunitiesByVideogameId() {
            return [];
        },
        async findPublicPostsByVideogameId() {
            return [];
        },
        async findCommentsByPostId() {
            return [];
        }
    };
}

async function withServer(callback) {
    const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), "letsplay-uploads-"));
    const app = createApp({
        videogameRepository: createMockVideogameRepository(),
        uploadDir
    });
    const server = await new Promise((resolve) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
        await callback(baseUrl, uploadDir);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        fs.rmSync(uploadDir, { recursive: true, force: true });
    }
}

describe("detectImageType", () => {
    it("detects PNG, JPEG, GIF, and WEBP by magic bytes", () => {
        assert.deepEqual(detectImageType(PNG_BYTES), { ext: "png", mime: "image/png" });
        assert.deepEqual(detectImageType(JPEG_BYTES), { ext: "jpg", mime: "image/jpeg" });
        assert.deepEqual(detectImageType(GIF87A_BYTES), { ext: "gif", mime: "image/gif" });
        assert.deepEqual(detectImageType(GIF89A_BYTES), { ext: "gif", mime: "image/gif" });
        assert.deepEqual(detectImageType(WEBP_BYTES), { ext: "webp", mime: "image/webp" });
    });

    it("returns null for SVG, HTML, JS, plain text, empty buffer, and non-buffers", () => {
        assert.equal(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")), null);
        assert.equal(detectImageType(Buffer.from("<html><script>alert(1)</script></html>")), null);
        assert.equal(detectImageType(Buffer.from("console.log('xss')")), null);
        assert.equal(detectImageType(Buffer.from("plain text")), null);
        assert.equal(detectImageType(Buffer.from("RIFF1234WAVE")), null);
        assert.equal(detectImageType(Buffer.alloc(0)), null);
        assert.equal(detectImageType(null), null);
        assert.equal(detectImageType("not-a-buffer"), null);
    });
});

describe("uploadsRouter", () => {
    it("POST /api/uploads/image accepts valid PNG, writes file, and serves it with security headers", async () => {
        await withServer(async (baseUrl, uploadDir) => {
            const response = await fetch(`${baseUrl}/api/uploads/image`, {
                method: "POST",
                headers: { "Content-Type": "image/png" },
                body: PNG_BYTES
            });
            const body = await response.json();

            assert.equal(response.status, 201);
            assert.match(body.imageUrl, /^\/uploads\/[0-9a-f-]{36}\.png$/i);

            const filename = path.basename(body.imageUrl);
            const savedBytes = fs.readFileSync(path.join(uploadDir, filename));
            assert.deepEqual(savedBytes, PNG_BYTES);

            const serveResponse = await fetch(`${baseUrl}${body.imageUrl}`);
            const servedBytes = Buffer.from(await serveResponse.arrayBuffer());

            assert.equal(serveResponse.status, 200);
            assert.equal(serveResponse.headers.get("x-content-type-options"), "nosniff");
            assert.equal(serveResponse.headers.get("content-security-policy"), "default-src 'none'");
            assert.deepEqual(servedBytes, PNG_BYTES);
        });
    });

    it("POST /api/uploads/image accepts valid JPEG, WEBP, and GIF", async () => {
        await withServer(async (baseUrl) => {
            const cases = [
                { bytes: JPEG_BYTES, contentType: "image/jpeg", ext: "jpg" },
                { bytes: WEBP_BYTES, contentType: "image/webp", ext: "webp" },
                { bytes: GIF89A_BYTES, contentType: "image/gif", ext: "gif" }
            ];

            for (const item of cases) {
                const response = await fetch(`${baseUrl}/api/uploads/image`, {
                    method: "POST",
                    headers: { "Content-Type": item.contentType },
                    body: item.bytes
                });
                const body = await response.json();

                assert.equal(response.status, 201);
                assert.match(body.imageUrl, new RegExp(`^/uploads/[0-9a-f-]{36}\\.${item.ext}$`, "i"));
            }
        });
    });

    it("POST /api/uploads/image rejects disguised HTML or SVG even with Content-Type image/png", async () => {
        await withServer(async (baseUrl, uploadDir) => {
            const payloads = [
                Buffer.from("<!doctype html><script>alert(1)</script>"),
                Buffer.from("<svg onload=alert(1)></svg>")
            ];

            for (const payload of payloads) {
                const response = await fetch(`${baseUrl}/api/uploads/image`, {
                    method: "POST",
                    headers: { "Content-Type": "image/png" },
                    body: payload
                });
                const body = await response.json();

                assert.equal(response.status, 400);
                assert.deepEqual(body, {
                    error: "Unsupported or invalid image file. Allowed: PNG, JPEG, WEBP, GIF"
                });
            }

            assert.deepEqual(fs.readdirSync(uploadDir), []);
        });
    });

    it("POST /api/uploads/image rejects empty body with 400", async () => {
        await withServer(async (baseUrl) => {
            const response = await fetch(`${baseUrl}/api/uploads/image`, {
                method: "POST",
                headers: { "Content-Type": "application/octet-stream" },
                body: Buffer.alloc(0)
            });
            const body = await response.json();

            assert.equal(response.status, 400);
            assert.deepEqual(body, { error: "Image file is required" });
        });
    });
});
