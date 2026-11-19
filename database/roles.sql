
-- ==========================================
-- LETSPLAY: ROLE DEFINITIONS
-- ==========================================

-- Permission roles
CREATE ROLE letsplay_readonly NOLOGIN;
CREATE ROLE letsplay_writeonly NOLOGIN;
CREATE ROLE letsplay_updateonly NOLOGIN;
CREATE ROLE letsplay_deleteonly NOLOGIN;

-- Users
CREATE USER letsplay_admin WITH PASSWORD 'adminPl4y';
CREATE USER letsplay_guest WITH PASSWORD 'guestPl4y';
CREATE USER letsplay_user WITH PASSWORD 'userPl4y';

-- Roles assignation

-- Admin
GRANT letsplay_readonly TO letsplay_admin;
GRANT letsplay_writeonly TO letsplay_admin;
GRANT letsplay_updateonly TO letsplay_admin;
GRANT letsplay_deleteonly TO letsplay_admin;

-- Guest
GRANT letsplay_readonly TO letsplay_guest;

-- User
GRANT letsplay_readonly TO letsplay_user;
GRANT letsplay_writeonly TO letsplay_user;
GRANT letsplay_updateonly TO letsplay_user;

-- Create database
CREATE DATABASE letsplay;
