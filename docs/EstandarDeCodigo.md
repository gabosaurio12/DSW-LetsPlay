# Estándar de codificación para desarrollo web (React + Express.js)

**Proyecto:** Let's Play

**Stack:** React (frontend) · Express.js (backend) · PostgreSQL + MongoDB (persistencia)

**Versión:** 1.0

---

## Índice

1. Introducción
   - 1.1. Lenguaje de desarrollo
   - 1.2. Idioma del código fuente
   - 1.3. Alcance del estándar
2. Reglas de nombrado
   - 2.1. Variables
   - 2.2. Campos y propiedades de objetos/clases
   - 2.3. Constantes
   - 2.4. Parámetros
   - 2.5. Funciones y métodos
   - 2.6. Clases
   - 2.7. Componentes de React
   - 2.8. Hooks personalizados
   - 2.9. Interfaces y tipos (si se usa TypeScript)
   - 2.10. Archivos y carpetas
   - 2.11. Abreviaturas válidas
3. Estilos de código
   - 3.1. Indentación
   - 3.2. Longitud máxima de línea
   - 3.3. Uso de espacios en blanco
   - 3.4. Llaves
   - 3.5. Paréntesis
   - 3.6. Comillas y punto y coma
4. Prácticas de programación
   - 4.1. Principios generales
   - 4.2. Funciones flecha (arrow functions)
   - 4.3. Uso de const/let
   - 4.4. Async/await y promesas
   - 4.5. Desestructuración y spread
   - 4.6. Métodos funcionales de arreglos (map, filter, reduce)
5. Estructuras de control
   - 5.1. if - else
   - 5.2. If de una línea
   - 5.3. Else if
   - 5.4. Switch
   - 5.5. Operadores ternarios
   - 5.6. While
   - 5.7. Do-While
   - 5.8. For / for-of / for-in
6. Manejo de excepciones
   - 6.1. Bloques try-catch
   - 6.2. Manejo de errores en código asíncrono
   - 6.3. Middleware de manejo de errores en Express
   - 6.4. Registro de errores (logging)
7. Comentarios
   - 7.1. Comentarios de línea única
   - 7.2. Comentarios de bloque
   - 7.3. Comentarios JSDoc (documentación de API)
8. Pruebas
   - 8.1. Casos a cubrir
   - 8.2. Nombrado de pruebas
9. Control de versiones
   - 9.1. Sistema de control de versiones
   - 9.2. Repositorio
   - 9.3. Estructura de ramas
   - 9.4. Commits
   - 9.5. Pull Requests
   - 9.6. Resolución de conflictos
10. Bibliografía

---

# Chapter 1. Introducción

Este estándar está dirigido al desarrollo del proyecto Let's Play, construido con **React** en el frontend y **Express.js** en el backend. Se recomienda usarlo durante todo el desarrollo del producto, con el objetivo de establecer una base común para la construcción y lectura del código entre todos los integrantes del equipo y para validar el código generado por agentes de IA de desarrollo.

Las reglas de estilo, nombrado y prácticas de este documento siguen las convenciones habituales del ecosistema JavaScript/TypeScript, React y Node.js.

## 1.1. Lenguaje de desarrollo

Este estándar está pensado para aplicarse a **JavaScript (ES2020+)**, usado tanto en el frontend con **React** como en el backend con **Express.js** sobre **Node.js**. Si el equipo decide adoptar **TypeScript** en algún punto del proyecto, las reglas de este documento siguen aplicando; la sección 2.9 cubre las convenciones adicionales para tipos e interfaces.

## 1.2. Idioma del código fuente

El código fuente (nombres de variables, funciones, clases, componentes, comentarios y mensajes de commit) debe escribirse en **inglés**. Se tomó esta decisión para mantener consistencia con el ecosistema de librerías de JavaScript (que está documentado casi en su totalidad en inglés) y para facilitar la integración de nuevas herramientas o colaboradores.

El idioma de la interfaz gráfica (GUI) que ve el usuario final puede ser cualquiera; el proyecto puede incluir varios perfiles de idioma para la UI sin que esto afecte el idioma del código fuente.

## 1.3. Alcance del estándar

El estándar abarca buenas prácticas de programación para React y Express (convenciones recomendadas por la comunidad y por guías ampliamente adoptadas como la Guía de Estilo de Airbnb), legibilidad, orden, espaciado, nombramiento, manejo de excepciones, registro de errores y reglas de pruebas. También sirve como referencia para que los agentes de IA utilizados en el desarrollo validen el código generado antes de integrarlo al proyecto.

---

# Chapter 2. Reglas de nombrado

Estas reglas establecen las convenciones que el equipo deberá seguir para nombrar los elementos del código. El objetivo es mantener un código **uniforme, claro y fácil de comprender y mantener**.

En el ecosistema web **camelCase** es la convención dominante para variables, funciones, parámetros y campos, mientras que **PascalCase** se reserva casi exclusivamente para clases y componentes de React. Es importante utilizar en general nombres **significativos** y **descriptivos** (Airbnb, 2026).

## 2.1. Variables

Las variables deben utilizar nombres acordes con el dominio, claros y descriptivos, usando **camelCase**. Se deberán evitar los nombres abreviados o de una sola letra, salvo en contadores de ciclos (ver la sección de "Estructuras de control") o en parámetros de funciones flecha muy cortas (ver la sección de "Funciones flecha").

**Correcto**

```javascript
let playerHealth = 100;
let movementSpeed = 5.5;
```

**Incorrecto**

```javascript
let ph = 100;
let MovementSpeed = 5.5;
```

## 2.2. Campos y propiedades de objetos/clases

Los campos de clases y las propiedades de objetos deben escribirse en **camelCase**, sin importar si son públicos o privados (los campos privados se marcan con el prefijo `#`, propio del lenguaje).

**Correcto**

```javascript
class GameSession {
  #currentWeapon;
  activePlayers = [];

  constructor() {
    this.#currentWeapon = null;
  }
}
```

**Incorrecto**

```javascript
class GameSession {
  CurrentWeapon;
  Active_Players = [];
}
```

## 2.3. Constantes

Los valores que representan una constante verdadera de configuración o de dominio (que no cambiarán en tiempo de ejecución y son conocidos de antemano) deberán usar **UPPER_SNAKE_CASE**. Las constantes declaradas con `const` que simplemente evitan la reasignación de una variable local (la mayoría de los casos) siguen la regla de variables (camelCase); `const` no implica automáticamente UPPER_SNAKE_CASE.

**Correcto**

```javascript
const MAX_LOGIN_ATTEMPTS = 3;
const DEFAULT_AVATAR_URL = "/assets/default-avatar.png";

// const usado como variable local inmutable: sigue camelCase
const totalPlayers = activePlayers.length;
```

**Incorrecto**

```javascript
const maxloginattempts = 3;
const Default_Avatar_Url = "/assets/default-avatar.png";
```

### 2.3.1. Razonamiento

Reservar UPPER_SNAKE_CASE para constantes de configuración/dominio permite distinguir, con solo ver el nombre, un valor fijo del sistema de una variable local declarada con `const` por buena práctica.

## 2.4. Parámetros

Los parámetros de funciones y métodos deben utilizar **camelCase** y tener nombres que describan claramente el dato que reciben. No se deben usar nombres ambiguos o abreviaturas innecesarias.

**Correcto**

```javascript
function dealDamage(dealtDamage, currentHp) {
}
```

**Incorrecto**

```javascript
function dealDamage(Dmg, h) {
}
```

## 2.5. Funciones y métodos

Las funciones y métodos deben tener nombres claros, descriptivos y representar la acción que realizan, usando **camelCase**. Esto aplica tanto a funciones declaradas (`function`) como a funciones flecha asignadas a una constante y a métodos de clases.

**Correcto**

```javascript
function startGame() {
}

const calculatePlayerDamage = (attacker, defender) => {
};
```

**Incorrecto**

```javascript
function StartGame() {
}

const calc_dmg = (attacker, defender) => {
};
```

### 2.5.1. Razonamiento

`StartGame` es incorrecto porque usa PascalCase, que en JavaScript se reserva para clases y componentes de React; `calc_dmg` es incorrecto porque usa snake_case y una abreviatura poco descriptiva.

## 2.6. Clases

Las clases deberán ser nombradas con un sustantivo descriptivo y escritas con **PascalCase**.

**Correcto**

```javascript
class UserRepository {
}
```

**Incorrecto**

```javascript
class userRepository {
}
```

## 2.7. Componentes de React

Los componentes de React deben nombrarse con **PascalCase**, sean funciones o clases, ya que React distingue componentes de elementos HTML nativos por la mayúscula inicial. El nombre del archivo del componente debe coincidir con el nombre del componente (ver sección 2.10).

**Correcto**

```jsx
function UserProfileCard({ user }) {
  return <div className="profile-card">{user.name}</div>;
}

export default UserProfileCard;
```

**Incorrecto**

```jsx
function userProfileCard({ user }) {
  return <div className="profile-card">{user.name}</div>;
}
```

### 2.7.1. Razonamiento

Si `userProfileCard` se escribe en minúscula, React lo interpretará como una etiqueta HTML nativa (`<userprofilecard />`) y no como un componente, lo cual rompe la aplicación.

## 2.8. Hooks personalizados

Los hooks personalizados de React deben iniciar obligatoriamente con el prefijo `use`, seguido del nombre en **camelCase**, siguiendo la convención que React usa para identificar hooks y aplicar las reglas de hooks (React, 2026).

**Correcto**

```javascript
function useFriendsList(userId) {
  // ...
}
```

**Incorrecto**

```javascript
function friendsList(userId) {
  // ...
}

function GetFriendsList(userId) {
  // ...
}
```

## 2.9. Interfaces y tipos (si se usa TypeScript)

En TypeScript **no se usa prefijo** para interfaces ni tipos; se nombran con **PascalCase** y un sustantivo descriptivo del contrato o forma de datos que representan.

**Correcto**

```typescript
interface UserProfile {
  id: string;
  displayName: string;
}

type GameInvite = {
  fromUserId: string;
  toUserId: string;
};
```

**Incorrecto**

```typescript
interface IUserProfile {
  id: string;
  displayName: string;
}
```

### 2.9.1. Razonamiento

En TypeScript un prefijo como `I` se considera ruido innecesario, porque el propio sistema de tipos ya distingue interfaces de clases (TypeScript, 2026).

## 2.10. Archivos y carpetas

- Los archivos que exportan **un componente de React** deben nombrarse igual que el componente, en PascalCase: `UserProfileCard.jsx`.
- Los archivos que exportan **hooks** deben iniciar con `use`, en camelCase: `useFriendsList.js`.
- Los demás archivos (utilidades, servicios, modelos, controladores, rutas) deben nombrarse en **camelCase** y describir claramente su contenido: `authService.js`, `userController.js`, `postRoutes.js`.
- Las carpetas se nombran en **camelCase** o en minúsculas separadas por guiones (`kebab-case`), de forma consistente dentro de todo el proyecto.

**Correcto**

```
components/UserProfileCard.jsx
hooks/useFriendsList.js
services/authService.js
controllers/postController.js
```

**Incorrecto**

```
components/userprofilecard.jsx
hooks/FriendsList.js
services/AuthService.js
controllers/post_controller.js
```

## 2.11. Abreviaturas válidas

Las abreviaturas serán válidas solo en dos casos: que sean referentes a reglas de negocio o dominio del proyecto, o que estén en el siguiente diccionario.

| Abreviatura | Significado |
|---|---|
| DTO | Data Transfer Object |
| DB | DataBase |
| API | Application Programming Interface |
| UI | User Interface |
| UX | User Experience |
| Req | Request |
| Res | Response |
| Auth | Authentication / Authorization |
| Max | Maximum |
| Min | Minimum |

---

# Chapter 3. Estilos de código

## 3.1. Indentación

Para los espacios de indentación deberán usarse espacios en blanco, cada nivel equivale a **2 espacios** (convención estándar en JavaScript/React). Un "tab" equivaldrá a 2 espacios en blanco.

**Correcto**

```javascript
class Person {
  printName(repetitions) {
    for (let i = 0; i < repetitions; i++) {
      console.log(this.name);
    }
  }
}
```

**Incorrecto**

```javascript
class Person {
    printName(repetitions) {
        for (let i = 0; i < repetitions; i++) {
            console.log(this.name);
        }
    }
}
```

## 3.2. Longitud máxima de línea

Cada línea debe tener por mucho **100 caracteres**. En caso de que se exceda esa cantidad, se debe continuar en la siguiente línea en alguno de los siguientes puntos:

- Operadores lógicos o matemáticos (`&&`, `||`, `+`, `-`, etc.)
- Después de una coma, especialmente en listas de argumentos.
- Después de un paréntesis o corchete de apertura.
- Entre métodos encadenados (method chaining), cada `.` en una nueva línea.

**Correcto**

```javascript
const activePlayers = players
  .filter((player) => player.isOnline)
  .map((player) => player.name);
```

**Incorrecto**

```javascript
const activePlayers = players.filter((player) => player.isOnline).map((player) => player.name);
```

## 3.3. Uso de espacios en blanco

Se usará un espacio en blanco alrededor de operadores y después de comas, igual que en el estándar de referencia.

**Correcto**

```javascript
const total = firstNumber + secondNumber;
console.log("Calculation result:", total);

for (let i = 0; i < 10; i++) {
  console.log("Iteration:", i);
}
```

**Incorrecto**

```javascript
const total=firstNumber+secondNumber;
console.log("Result:"+total);
for(let i=0;i<10;i++){
  console.log(i);
}
```

## 3.4. Llaves

Las llaves de apertura de clases, funciones, componentes y estructuras de control deben ir **en la misma línea** de la declaración, no en una línea nueva. La llave de cierre debe estar en su propia línea, alineada con el inicio de la declaración.

**Correcto**

```javascript
class Client {
  greet() {
    console.log("Hello!");
  }
}
```

**Incorrecto**

```javascript
class Client
{
  greet()
  {
    console.log("Hello!");
  }
}
```

### 3.4.1. Razonamiento

Este estilo (conocido como "one true brace style" o estilo K&R) es el usado por la gran mayoría de guías de estilo de JavaScript (Airbnb, Google, el propio ESLint por defecto) y reduce el espacio vertical que ocupa el código (Airbnb, 2026).

## 3.5. Paréntesis

Cuando el contenido dentro de los paréntesis de una llamada a función sea muy largo, se debe dividir en varias líneas, con un argumento por línea y el paréntesis de cierre alineado con el inicio de la declaración.

**Correcto**

```javascript
character.equip(
  fightingEquipment,
  potions,
  fastAbilities
);
```

**Incorrecto**

```javascript
character.equip(fightingEquipment, potions, fastAbilities, extraItem, anotherItem);
```

## 3.6. Comillas y punto y coma

- Se usarán **comillas dobles (`"`)** para cadenas de texto en JavaScript, y las comillas correspondientes de JSX para atributos.
- Se debe **terminar cada sentencia con punto y coma (`;`)**, de forma explícita, para evitar errores de interpretación automática del lenguaje (ASI).

**Correcto**

```javascript
const greeting = "Welcome back!";
```

**Incorrecto**

```javascript
const greeting = 'Welcome back!'
```

---

# Chapter 4. Prácticas de programación

El uso de las siguientes prácticas es extremadamente recomendado y necesario; se recomienda hacer revisiones de código constantes (manuales o con linters como ESLint) para validar su uso.

## 4.1. Principios generales

- Principio de Responsabilidad Única (SRP).
- Evitar código duplicado (DRY).
- Funciones pequeñas y específicas.
  - De aproximadamente 30 líneas máximo. Deben hacer únicamente lo necesario para cumplir la función a la que hace referencia su nombre.
- Número máximo de parámetros.
  - Una función no debe tener más de 3 parámetros; si se necesitan más, se debe recibir un único objeto de opciones.
- Complejidad ciclomática.
  - La complejidad ciclomática de una función no debe superar el valor de 10.
- Números mágicos.
  - El código no debe tener números mágicos; deben extraerse a constantes nombradas (ver sección 2.3).
- Código muerto.
  - El código que no se use se debe borrar; está prohibido comentarlo "para no borrarlo" (para eso está el control de versiones).
- Valores nulos/indefinidos.
  - Se debe evitar retornar o propagar `null`/`undefined` sin control; preferir validaciones explícitas o valores por defecto.
- Variables inmutables por defecto.
  - Debe usarse `const` siempre que sea posible (ver sección 4.3).
- Uso de async/await.
  - Debe usarse en toda operación asíncrona (llamadas a la API, consultas a base de datos, lectura de archivos).
- Uso de funciones flecha.
  - Se recomienda su uso para callbacks cortos y para mantener el `this` léxico correcto.
- Uso de métodos funcionales de arreglos.
  - Deben usarse en lugar de bucles manuales siempre que mejoren la legibilidad (ver sección 4.6).
- Validación de entradas.
  - Toda entrada que venga del usuario o del cliente (body, params, query) debe validarse antes de usarse (p. ej. con una librería como Zod o Joi).

## 4.2. Funciones flecha (arrow functions)

Son una forma abreviada de escribir una función, que además no re-enlaza el valor de `this`.

**Sintaxis básica**

```javascript
(parameters) => expressionOrBlock
```

**Ejemplos**

Con un solo parámetro:

```javascript
const isEven = (n) => n % 2 === 0;
```

Con múltiples parámetros:

```javascript
const addNumbers = (a, b) => a + b;
```

Sin parámetros:

```javascript
const greet = () => console.log("Hello!");
```

Con cuerpo de bloque (varias líneas):

```javascript
const classifyNumber = (n) => {
  if (n < 0) return "Negative";
  if (n === 0) return "Zero";
  return "Positive";
};
```

### 4.2.1. Nota de nombrado de parámetros

En funciones flecha muy cortas usadas como callbacks de un solo paso (como dentro de `map` o `filter`) se permite el uso de nombres de una sola letra cuando el tipo de dato es evidente por el contexto (por ejemplo, `p` para un elemento de `players`).

### 4.2.2. Cuándo se deben usar

1. Callbacks de métodos funcionales de arreglos (`map`, `filter`, `reduce`, etc.), donde se expresa una condición o transformación de forma concisa.

```javascript
const onlinePlayers = players.filter((p) => p.isOnline);
```

2. Callbacks o manejadores de eventos cortos en componentes de React.

```javascript
<button onClick={() => setIsOpen(true)}>Open</button>
```

3. Cuando se necesita preservar el `this` léxico (por ejemplo, dentro de un método de clase que se pasa como callback).

### 4.2.3. Cuándo no se deben usar

1. Cuando la lógica es compleja o extensa. Si supera un aproximado de 10 líneas o necesita varias condiciones anidadas, es mejor extraerla a una función nombrada, para mejorar la legibilidad y la capacidad de prueba.

**Correcto**

```javascript
const eligiblePlayers = players.filter(isEligiblePlayer);

function isEligiblePlayer(player) {
  const score = player.wins * 3 + player.draws;
  const bonus = player.isCaptain ? 10 : 0;
  const adjusted = score + bonus - player.penalties;
  return adjusted > 50 && player.yearsActive > 2 && !player.isSuspended;
}
```

**Incorrecto**

```javascript
const eligiblePlayers = players.filter((player) => {
  const score = player.wins * 3 + player.draws;
  const bonus = player.isCaptain ? 10 : 0;
  const adjusted = score + bonus - player.penalties;
  return adjusted > 50 && player.yearsActive > 2 && !player.isSuspended;
});
```

2. Como método en un objeto literal o clase donde se necesite que `this` apunte al objeto en tiempo de llamada en vez de al contexto léxico (en esos casos se debe usar una función/método tradicional).

## 4.3. Uso de const/let

Se debe usar `const` por defecto para toda declaración de variable; solo se usará `let` cuando la variable deba reasignarse explícitamente. **El uso de `var` está prohibido** en el proyecto, ya que su alcance de función (en lugar de bloque) es una fuente común de errores.

**Correcto**

```javascript
const maxRetries = 3;
let currentAttempt = 0;
```

**Incorrecto**

```javascript
var maxRetries = 3;
var currentAttempt = 0;
```

## 4.4. Async/await y promesas

Toda operación asíncrona (peticiones HTTP, consultas a PostgreSQL/MongoDB, lectura de archivos) debe manejarse con `async`/`await` en lugar de encadenar `.then()/.catch()`, ya que mejora la legibilidad y facilita el manejo de errores con `try/catch` (ver capítulo 6).

**Correcto**

```javascript
async function getUserProfile(userId) {
  const user = await userRepository.findById(userId);
  return user;
}
```

**Incorrecto**

```javascript
function getUserProfile(userId) {
  return userRepository.findById(userId).then((user) => {
    return user;
  });
}
```

## 4.5. Desestructuración y spread

Se debe usar desestructuración para extraer propiedades de objetos y elementos de arreglos, y el operador *spread* (`...`) para copiar o combinar objetos/arreglos sin mutarlos, en lugar de acceder a propiedades individualmente o mutar estructuras existentes.

**Correcto**

```javascript
const { id, displayName } = user;
const updatedUser = { ...user, displayName: "NewName" };
```

**Incorrecto**

```javascript
const id = user.id;
const displayName = user.displayName;

user.displayName = "NewName";
```

## 4.6. Métodos funcionales de arreglos (map, filter, reduce)

Permiten filtrar, transformar y agregar colecciones de forma declarativa. Deben preferirse sobre bucles manuales (`for`) cuando mejoren la legibilidad y no estén en una ruta crítica de rendimiento.

**Correcto**

```javascript
const topScores = players
  .filter((p) => p.score > 100)
  .sort((a, b) => b.score - a.score)
  .map((p) => p.name);
```

**Incorrecto (bucle manual innecesario)**

```javascript
const topScores = [];
for (let i = 0; i < players.length; i++) {
  if (players[i].score > 100) {
    topScores.push(players[i]);
  }
}
topScores.sort((a, b) => b.score - a.score);
```

### 4.6.1. Cuándo no se deben usar

En rutas de código muy sensibles al rendimiento (por ejemplo, procesamiento de grandes volúmenes de datos en tiempo real), donde la creación de arreglos intermedios por cada método encadenado puede introducir sobrecarga innecesaria; en esos casos se permite un bucle `for` manual, siempre acompañado de un comentario que explique la razón (ver capítulo 7).

---

# Chapter 5. Estructuras de control

## 5.1. if - else

Debe haber un espacio entre `if` y la condición. Se deben utilizar llaves siempre, incluso si el bloque es de una sola línea (ver excepción en 5.2). El `else` debe ir en la misma línea que la llave de cierre del `if`.

**Correcto**

```javascript
function checkAge(studentAge) {
  const adultAge = 18;
  if (studentAge >= adultAge) {
    console.log("The student is an adult.");
  } else {
    console.log("The student is underage.");
  }
}
```

**Incorrecto**

```javascript
function checkAge(studentAge) {
  const adultAge = 18;
  if(studentAge >= adultAge)
    console.log("The student is an adult.");
  else
    console.log("The student is underage.");
}
```

## 5.2. If de una línea

Se permite omitir las llaves únicamente dentro de funciones flecha de cuerpo de expresión simple. En funciones y métodos normales siempre deben usarse llaves.

**Correcto**

```javascript
const classify = (n) => (n >= 0 ? "Non-negative" : "Negative");
```

**Incorrecto**

```javascript
function checkAge(studentAge) {
  if (studentAge >= 18) console.log("The student is an adult.");
}
```

## 5.3. Else if

La estructura `else if` debe ir en la misma línea que la llave de cierre del bloque anterior, seguida de un espacio antes de la condición.

**Correcto**

```javascript
function checkGrade(grade) {
  if (grade >= 8) {
    return "Excellent!";
  } else if (grade >= 6) {
    return "Good!";
  } else {
    return "You can do it better!";
  }
}
```

**Incorrecto**

```javascript
function checkGrade(grade) {
  if (grade >= 8) {
    return "Excellent!";
  }
  else if (grade >= 6) {
    return "Good!";
  }
  else {
    return "You can do it better!";
  }
}
```

## 5.4. Switch

Debe declararse en una nueva línea, con un espacio antes de la condición. Cada `case` debe ser indentado un nivel respecto al `switch`. Siempre debe incluirse un caso `default`.

**Correcto**

```javascript
function menu(option) {
  switch (option) {
    case 1:
      console.log("You selected option 1");
      break;
    default:
      console.log("Select a valid option");
      break;
  }
}
```

**Incorrecto**

```javascript
function menu(option) {
  switch(option) {
  case 1:
  console.log("You selected option 1");
  break;
  default:
  console.log("Select a valid option");
  break;
  }
}
```

## 5.5. Operadores ternarios

El uso de operadores ternarios está permitido si se cumplen las siguientes condiciones:

- Solo hay dos posibles valores para asignar a una variable.
- Otra persona puede entender la lógica detrás del operador a la primera lectura.
- **No se permite la anidación de operadores ternarios** bajo ninguna circunstancia.

**Correcto**

```javascript
const isAdult = age >= 18;
const accessFee = isAdult ? 0 : 10;
```

**Incorrecto**

```javascript
const triangleType =
  sideA === sideB && sideB === sideC
    ? "Equilateral"
    : sideA === sideC || sideB === sideC
    ? "Isosceles"
    : "Scalene";
```

## 5.6. While

Debe existir un espacio entre la palabra `while` y la condición. Siempre se deben usar llaves, incluso para bloques de una sola línea.

**Correcto**

```javascript
while (numberA >= 0) {
  console.log(numberA);
  numberA--;
}
```

**Incorrecto**

```javascript
while(numberA >= 0) console.log(numberA--);
```

## 5.7. Do-While

La llave de apertura debe ir en la misma línea que `do`. La palabra `while` debe ir en la misma línea que la llave de cierre, separada por un espacio de la condición.

**Correcto**

```javascript
let numberA = 0;
do {
  console.log(numberA);
  numberA++;
} while (numberA <= 5);
```

**Incorrecto**

```javascript
let numberA = 0;
do
{
  console.log(numberA);
  numberA++;
}
while (numberA <= 5);
```

## 5.8. For / for-of / for-in

Debe haber un espacio entre `for` y la condición, y un espacio después de cada punto y coma. Se prefiere `for...of` para iterar sobre arreglos cuando no se necesita el índice, y los métodos funcionales (sección 4.6) cuando se está transformando o filtrando datos. Se permite que la variable contadora de un `for` clásico sea una letra (`i`, `j`, `k`), por ser una práctica muy común.

**Correcto**

```javascript
let evenCounter = 0;
for (let i = 1; i <= 20; i++) {
  if (i % 2 === 0) {
    evenCounter++;
  }
}

for (const player of activePlayers) {
  console.log(player.name);
}
```

**Incorrecto**

```javascript
let evenCounter = 0;
for(let i=1;i<=20;i++){
  if(i%2===0){evenCounter++;}
}
```

---

# Chapter 6. Manejo de excepciones

Los errores se deben propagar cuando ocurren en una capa inferior (repositorios, servicios de acceso a datos) y deben capturarse en la capa que los llama y que tiene suficiente contexto para decidir qué responder al cliente (normalmente, el controlador de la ruta en Express).

Todos los errores deben registrarse en la bitácora (logger). Si un error provoca que una petición no pueda completarse, se debe responder al cliente con un código de estado HTTP adecuado y un mensaje claro, sin exponer información sensible ni el stack trace completo.

Se evitará capturar `Error` genérico salvo como último recurso en el nivel más externo (por ejemplo, en el middleware global de errores); primero se deben capturar y manejar errores específicos y conocidos del dominio.

## 6.1. Bloques try-catch

Dentro del `try` debe estar, de preferencia, solo el código que puede lanzar una excepción. La variable que almacena el error atrapado debe llamarse `error` o `err`, de forma consistente en todo el proyecto. Las llaves de `try` y `catch` van en la misma línea de su declaración, siguiendo la regla de la sección 3.4.

**Correcto**

```javascript
try {
  const user = await userRepository.findById(userId);
  return user;
} catch (error) {
  logger.error("userService.getUserProfile", error);
  throw new NotFoundError("User not found");
}
```

**Incorrecto**

```javascript
try {
  const user = await userRepository.findById(userId);
  return user;
}
catch (error) {
  console.log(error.message);
}
```

## 6.2. Manejo de errores en código asíncrono

Toda función `async` usada como controlador de ruta en Express debe envolver su lógica en `try/catch` (o usar un *wrapper* común para evitar repetirlo en cada ruta), ya que una excepción dentro de una función `async` sin capturar se convierte en una promesa rechazada no manejada.

**Correcto**

```javascript
router.get("/users/:id", async (req, res, next) => {
  try {
    const user = await userService.getUserProfile(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);
  }
});
```

**Incorrecto**

```javascript
router.get("/users/:id", async (req, res) => {
  const user = await userService.getUserProfile(req.params.id);
  res.json(user);
});
```

### 6.2.1. Razonamiento

En el ejemplo incorrecto, si `getUserProfile` lanza un error, este nunca se captura ni se responde al cliente: la petición se queda colgada o Node.js termina el proceso dependiendo de la configuración.

## 6.3. Middleware de manejo de errores en Express

El proyecto debe contar con un único middleware de manejo de errores centralizado, declarado al final de la cadena de middlewares, que reciba los errores propagados con `next(error)` y responda al cliente con un mensaje seguro y el código de estado adecuado.

**Correcto**

```javascript
function errorHandler(err, req, res, next) {
  logger.error(err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.isOperational ? err.message : "Unexpected error",
  });
}

app.use(errorHandler);
```

**Incorrecto**

```javascript
app.use((err, req, res, next) => {
  res.status(500).send(err.stack);
});
```

### 6.3.1. Razonamiento

Enviar `err.stack` directamente al cliente expone detalles internos del servidor (rutas de archivos, dependencias, estructura del código) que pueden facilitar un ataque.

## 6.4. Registro de errores (logging)

Se debe usar una librería de logging (como **Winston** o **Pino**) en lugar de `console.log`/`console.error` para todo lo que no sea depuración temporal en desarrollo. Se deben respetar los niveles de severidad (`info`, `warn`, `error`) y el logger debe escribir tanto en consola como en un archivo o servicio centralizado de logs.

**Correcto**

```javascript
logger.info("Server started on port 3000");

try {
  await db.connect();
} catch (error) {
  logger.error("Database connection failed", error);
}
```

**Incorrecto**

```javascript
console.log("server started");

try {
  await db.connect();
} catch (error) {
  console.log(error);
}
```

---

# Chapter 7. Comentarios

En general, los comentarios jamás deben explicar **qué** hace el código (eso se debe deducir leyendo el código y los nombres bien elegidos), sino **por qué** se escribió así, cuando esto no sea evidente.

## 7.1. Comentarios de línea única

Se usan con `//` y deben ir en la línea anterior al código que describen, nunca al final de la misma línea de código (salvo anotaciones muy cortas de una palabra).

**Correcto**

```javascript
// Iterate over the list to find online players
for (const player of players) {
  // ...
}
```

**Incorrecto**

```javascript
function calc(l) { // this calculates stuff
}
```

## 7.2. Comentarios de bloque

Se pueden usar (no son recomendados) únicamente para explicar una implementación poco común en un método ya probado: por ejemplo, una solución que se aparta de un patrón habitual, o una optimización de rendimiento que sacrifica legibilidad. Se debe explicar por qué no se usó la solución estándar.

Se escriben con `/* */`, abriendo el comentario, escribiendo el mensaje en la(s) línea(s) siguiente(s) y cerrando el comentario una línea después de que termine el mensaje.

**Correcto**

```javascript
/*
  shuffleDeck uses Fisher-Yates instead of sort(() => Math.random() - 0.5)
  because the sort-based shuffle produces a biased distribution.
*/
function shuffleDeck(cards) {
  // ...
}
```

**Incorrecto**

```javascript
/* This function doesn't work well */

/*
  This function is for...
*/
```

## 7.3. Comentarios JSDoc (documentación de API)

Las funciones públicas de servicios, utilidades compartidas y hooks personalizados deben documentarse con **JSDoc**. Las etiquetas más comunes a usar son:

- `@param` — Explica cada parámetro, incluyendo su tipo.
- `@returns` — Describe qué devuelve la función.
- `@throws` — Describe qué excepción puede lanzar y bajo qué circunstancias.
- `@example` — Muestra un ejemplo de uso.

### 7.3.1. Ejemplo

```javascript
/**
 * Calculates the remaining health points after an attack.
 *
 * @param {number} currentHp - The current health points of the player.
 * @param {number} dealtDamage - The amount of damage received.
 * @returns {number} The remaining health points, never below 0.
 * @throws {RangeError} If dealtDamage is negative.
 * @example
 * const remainingHp = calculateRemainingHealth(100, 30); // 70
 */
function calculateRemainingHealth(currentHp, dealtDamage) {
  if (dealtDamage < 0) {
    throw new RangeError("dealtDamage can't be negative");
  }
  return Math.max(currentHp - dealtDamage, 0);
}
```

---

# Chapter 8. Pruebas

Las pruebas deben escribirse con **Jest** (y **React Testing Library** para componentes de React), y deberán abarcar algunos de los siguientes casos si es que aplican:

1. Caso ideal (happy path).
2. Entradas límite.
3. Entradas inválidas.
4. Comportamiento con datos duplicados.
5. Efectos colaterales.
6. Excepciones/errores lanzados.
7. Comprobación del valor de retorno.

Se recomienda contar con **una aserción principal por prueba** (se permiten aserciones auxiliares solo cuando son necesarias para validar el mismo comportamiento).

## 8.1. Casos a cubrir

Al escribir pruebas para un endpoint de Express, además de los casos anteriores se debe verificar explícitamente el **código de estado HTTP** retornado y la forma del cuerpo de la respuesta.

## 8.2. Nombrado de pruebas

El nombre de una prueba (dentro de un bloque `it`/`test`) debe describir, en lenguaje natural, el comportamiento esperado y el escenario bajo el cual ocurre, siguiendo el patrón: *"should [comportamiento esperado] when [escenario]"*.

**Correcto**

```javascript
describe("loginUser", () => {
  it("should return a token when credentials are valid", async () => {
    // ...
  });

  it("should throw an UnauthorizedError when the password is wrong", async () => {
    // ...
  });
});
```

**Incorrecto**

```javascript
describe("loginUser", () => {
  it("test1", async () => {
    // ...
  });

  it("works", async () => {
    // ...
  });
});
```

---

# Chapter 9. Control de versiones

El control de versiones permite que el equipo mantenga un historial organizado de los cambios realizados al proyecto, trabaje de forma paralela y revise las modificaciones antes de incorporarlas a la rama principal. Es obligatorio seguir las siguientes reglas.

## 9.1. Sistema de control de versiones

Se usará **Git** como sistema de control de versiones, y todos los cambios relevantes del código fuente deben registrarse mediante *commits* para que exista un historial que permita identificar cómo ha evolucionado el proyecto.

## 9.2. Repositorio

Debe haber un único repositorio para el proyecto (o uno por frontend/backend si el equipo decide separarlos), compartido por todos los integrantes. Cada repositorio debe contener únicamente el código y los archivos necesarios para desarrollar y construir el proyecto, evitando incorporar archivos innecesarios o generados automáticamente (`node_modules`, builds, archivos `.env`).

**Correcto**

```
repositorio
 ├── src/
 ├── tests/
 ├── README.md
 ├── .env.example
 └── .gitignore
```

**Incorrecto**

```
repositorio
 ├── src/
 ├── node_modules/
 ├── build-final.zip
 ├── backup/
 ├── .env
 └── cosas/
```

### 9.2.1. Razonamiento

El ejemplo incorrecto mezcla archivos del proyecto con dependencias instaladas, respaldos y credenciales (`.env`), que nunca deben subirse al repositorio.

## 9.3. Estructura de ramas

Se establece la siguiente estructura mínima:

```
main
|
|- feature/*
|- refactor/*
|- fix/*
|- exp/*
|- hotfix/*
```

Donde:
- `main`: versión estable del proyecto.
- `feature/`: desarrollo de nuevas funcionalidades.
- `fix/`: corrección de errores.
- `exp/`: para probar soluciones fuera de lo común o experimentar.
- `hotfix/`: correcciones urgentes sobre una versión estable/desplegada.

**Correcto**

```
feature/friend-requests
feature/post-comments
refactor/auth-middleware
fix/profile-image-upload
hotfix/login-500-error
```

**Incorrecto**

```
nuevas-cosas
test
mi-rama
cambios2
```

## 9.4. Commits

Cada commit debe indicar con uno de los siguientes prefijos, siguiendo el formato de *Conventional Commits* (Conventional Commits, 2026):

- `feat:` Para indicar una nueva funcionalidad.
- `fix:` Para indicar que se arregló algo.
- `refactor:` Para indicar que se refactorizó alguna parte del proyecto.
- `conflicts:` Para indicar que se resolvieron conflictos con alguna rama.
- `config:` Para archivos de configuración.
- `docs:` Para indicar que se actualizó la documentación.
- `test:` Para indicar que se agregaron o modificaron pruebas.

Esto se debe acompañar de un mensaje breve y descriptivo que permita comprender qué se modificó sin tener que inspeccionar inmediatamente el código.

**Correcto**

```
git commit -m "feat: add friend request endpoint"
git commit -m "fix: profile image not updating after upload"
git commit -m "refactor: auth middleware to use async/await"
git commit -m "test: add tests for login error cases"
```

**Incorrecto**

```
git commit -m "changes"
git commit -m "feat"
git commit -m "asdasd"
```

## 9.5. Pull Requests

Los cambios destinados a incorporarse a la rama principal deben hacerse mediante un *Pull Request*, nunca modificando `main` directamente. Un Pull Request permite proponer cambios desde una rama, revisarlos e integrarlos posteriormente, y ayuda a detectar problemas antes de que lleguen a la rama principal.

**Correcto**

```
feature/friend-requests
         │
         ▼
    Pull Request
         │
      Revisión
         │
         ▼
       main
```

**Incorrecto**

```
git switch main
git add .
git commit -m "add friend requests"
git push
```

## 9.6. Resolución de conflictos

Cuando existan cambios incompatibles que generen conflictos entre ramas, estos deben resolverse antes de hacer el *merge*. El desarrollador responsable debe revisar manualmente las diferencias, conservar la implementación correcta y verificar posteriormente (ejecutando las pruebas) que el proyecto continúe funcionando como se esperaba.

---

# Chapter 10. Bibliografía

Airbnb. (2026). *JavaScript Style Guide*. GitHub. https://github.com/airbnb/javascript

Airbnb. (2026). *React/JSX Style Guide*. GitHub. https://github.com/airbnb/javascript/tree/master/react

MDN Web Docs. (2026). *JavaScript guide*. Mozilla. https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide

React. (2026). *Rules of Hooks*. React Documentation. https://react.dev/warnings/invalid-hook-call-warning

React. (2026). *Your First Component*. React Documentation. https://react.dev/learn/your-first-component

Express.js. (2026). *Error handling*. Express Documentation. https://expressjs.com/en/guide/error-handling.html

TypeScript. (2026). *TypeScript Handbook: Interfaces*. https://www.typescriptlang.org/docs/handbook/2/objects.html

JSDoc. (2026). *JSDoc Documentation*. https://jsdoc.app/

Jest. (2026). *Getting Started*. https://jestjs.io/docs/getting-started

Testing Library. (2026). *React Testing Library*. https://testing-library.com/docs/react-testing-library/intro/

Chacon, S., & Straub, B. (2014). *Pro Git* (2nd ed.). Apress. https://git-scm.com/book/en/v2/

Conventional Commits. (2026). *Conventional Commits 1.0.0*. https://www.conventionalcommits.org/en/v1.0.0/

GitHub. (2026). *About pull requests*. GitHub Docs. https://docs.github.com/en/pull-requests/get-started/about-pull-requests

---

# Anexo. Cadena de razonamiento auditable

1. Se definió el alcance del estándar a partir del stack del proyecto (React + Express.js, con persistencia en PostgreSQL y MongoDB) y de las 10 secciones solicitadas: introducción, reglas de nombrado, estilos de código, prácticas de programación, estructuras de control, manejo de excepciones, comentarios, pruebas, control de versiones y bibliografía.
2. Para reglas de nombrado y estilo se adoptaron las convenciones estándar del ecosistema JavaScript/React (camelCase para variables, parámetros, funciones y campos; PascalCase para clases, componentes de React e interfaces/tipos de TypeScript; llaves en la misma línea de la declaración; indentación de 2 espacios), por ser las convenciones más ampliamente adoptadas por guías de estilo como la de Airbnb y por la propia documentación de React.
3. Para prácticas de programación se incluyeron los mecanismos propios del lenguaje para expresar lógica de forma concisa y segura: funciones flecha, `const`/`let`, async/await, desestructuración/spread y métodos funcionales de arreglos (`map`, `filter`, `reduce`), junto con principios agnósticos al lenguaje (SRP, evitar números mágicos, límite de parámetros, complejidad ciclomática).
4. Para manejo de excepciones se definió el flujo específico de una aplicación Express: captura con try/catch en funciones asíncronas, propagación con `next(error)`, un middleware centralizado de manejo de errores y registro con una librería de logging (Winston o Pino) en vez de `console.log`.
5. Para comentarios se definieron los comentarios de línea, de bloque y la documentación de funciones públicas con JSDoc, con sus etiquetas más comunes (`@param`, `@returns`, `@throws`, `@example`).
6. Para pruebas y control de versiones se definieron las herramientas concretas del proyecto (Jest y React Testing Library; Git con Conventional Commits y Pull Requests) y los criterios de cobertura y nombrado correspondientes.
7. Las referencias bibliográficas se seleccionaron de fuentes verificables propias del ecosistema JavaScript/React/Express: la guía de estilo de Airbnb, la documentación oficial de React, Express, TypeScript, JSDoc y Jest, entre otras.
8. Se incluyó este anexo con la cadena de razonamiento auditable conforme a la preferencia indicada por el usuario de generarla siempre.
