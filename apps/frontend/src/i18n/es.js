const es = {
  header: {
    title: "LetsPlay",
    tagline: "La red social para gamers",
    languageToggle: "Idioma",
  },
  survey: {
    title: "Bienvenido a LetsPlay",
    intro: "Cuéntanos tus gustos para encontrar tu gente. Todos los pasos son obligatorios.",
    stepProgress: "Paso {current} de {total}",
    steps: {
      genres: {
        title: "¿Qué géneros te enganchan?",
        description: "Elige entre 1 y 5 géneros favoritos.",
      },
      platforms: {
        title: "¿Dónde juegas?",
        description: "Elige entre 1 y 5 plataformas.",
      },
      availability: {
        title: "¿Cuándo te conectas?",
        description: "Elige al menos una opción.",
      },
    },
    options: {
      genres: {
        rpg: "RPG",
        shooter: "Shooter / FPS",
        platformer: "Plataformas",
        strategy: "Estrategia",
        fighting: "Peleas",
        sports: "Deportes",
        indie: "Indie",
        simulation: "Simulación",
      },
      platforms: {
        pc: "PC",
        playstation: "PlayStation",
        xbox: "Xbox",
        nintendoSwitch: "Nintendo Switch",
        mobile: "Móvil",
        vr: "VR",
      },
      availability: {
        weekdayNights: "Entre semana, de noche",
        weekendMornings: "Fin de semana, de mañana",
        weekendNights: "Fin de semana, de noche",
        weekdayAfternoons: "Entre semana, por la tarde",
        anyTime: "Cualquier momento",
      },
    },
    summary: {
      title: "Revisa tus respuestas",
      genres: "Géneros favoritos",
      platforms: "Plataformas",
      availability: "Disponibilidad",
      edit: "Editar",
      empty: "Sin respuestas",
    },
    confirmed: {
      title: "¡Todo listo!",
      message: "Tus respuestas quedaron guardadas. Podrás cambiarlas desde tu perfil más adelante.",
      edit: "Editar respuestas",
    },
    actions: {
      back: "Atrás",
      continue: "Continuar",
      confirm: "Guardar respuestas",
      saving: "Guardando...",
    },
    errors: {
      minSelections: "Selecciona al menos {count}.",
      maxSelections: "Puedes elegir como máximo {count} opciones.",
      save: "No fue posible guardar tus respuestas. Revisa tu conexión e inténtalo de nuevo.",
  profile: {
    title: "Tu perfil",
    intro: "Cuéntanos quién eres para que los demás te encuentren. Todos los campos marcados son necesarios.",
    form: {
      title: "Información de perfil",
      description: "Estos datos serán visibles para el resto de la comunidad.",
    },
    fields: {
      visibleName: "Nombre visible",
      bio: "Descripción personal",
      avatarUrl: "Fotografía de perfil",
      videogames: "Biblioteca personal de videojuegos",
      videogamesHint: "Elige entre 1 y {count} videojuegos aprobados; representan tus favoritos o juegos de interés.",
    },
    placeholders: {
      visibleName: "Cómo quieres que te vean (máximo 100 caracteres)",
      bio: "Cuéntale a la comunidad qué te gusta jugar (opcional)",
      avatarUrl: "URL de tu foto de perfil (opcional)",
    },
    summary: {
      empty: "Sin datos",
      videogames: "Biblioteca personal",
    },
    confirmed: {
      title: "¡Perfil guardado!",
      message: "Tu información quedó guardada. Podrás cambiarla cuando quieras.",
      edit: "Editar perfil",
    },
    actions: {
      save: "Guardar cambios",
      saving: "Guardando...",
    },
    errors: {
      visibleNameRequired: "Escribe tu nombre visible.",
      visibleNameTooLong: "El nombre visible no puede superar {count} caracteres.",
      videogamesMin: "Selecciona al menos {count} videojuego.",
      videogamesMax: "Puedes elegir como máximo {count} videojuegos.",
      save: "No fue posible guardar tu perfil. Revisa tu conexión e inténtalo de nuevo.",
    },
    videogames: {
      eldenRing: "Elden Ring",
      hollowKnight: "Hollow Knight",
      minecraft: "Minecraft",
      cyberpunk2077: "Cyberpunk 2077",
      stardewValley: "Stardew Valley",
      baldursGate3: "Baldur's Gate 3",
      valorant: "Valorant",
      zeldaTearsOfTheKingdom: "Zelda: Tears of the Kingdom",
    },
  },
}}};

export default es;
