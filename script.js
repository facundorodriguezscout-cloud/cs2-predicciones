const SUPABASE_URL = "https://bygbnwnrwdrylkehucpo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_G6_Di3Gmi-Ty5TM-RFg4Ew_KkiQQvYa";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarPartidos() {
  const { data: partidos, error } = await client
    .from("partidos")
    .select("*")
    .order("torneo", { ascending: true })
    .order("fecha_partido", { ascending: true });

  if (error) {
    console.error("Error trayendo partidos:", error);
    return;
  }

  const contenedor = document.getElementById("lista-partidos");
  contenedor.innerHTML = "";

  let torneoActual = undefined;

  partidos.forEach((partido) => {
    // Si cambiamos de torneo, agregamos un subtítulo nuevo
    if (partido.torneo !== torneoActual) {
      torneoActual = partido.torneo;
      const subtitulo = document.createElement("h3");
      subtitulo.textContent = torneoActual || "Sin torneo asignado";
      contenedor.appendChild(subtitulo);
    }

    const fila = document.createElement("div");
    fila.classList.add("fila-partido");
    fila.innerHTML = `
      <span>${partido.equipo_a}</span>
      <input type="number" class="marcador-a" placeholder="0" min="0">
      <span>vs</span>
      <input type="number" class="marcador-b" placeholder="0" min="0">
      <span>${partido.equipo_b}</span>
      <span>${new Date(partido.fecha_partido).toLocaleDateString()}</span>
      <button class="btn-predecir">Predecir</button>
    `;

    const boton = fila.querySelector(".btn-predecir");
    boton.addEventListener("click", () => guardarPrediccion(partido.id, fila));

    contenedor.appendChild(fila);
  });
}

async function guardarPrediccion(partidoId, fila) {
  const marcadorA = fila.querySelector(".marcador-a").value;
  const marcadorB = fila.querySelector(".marcador-b").value;

  if (marcadorA === "" || marcadorB === "") {
    alert("Completá los dos marcadores antes de predecir.");
    return;
  }

  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    alert("Tenés que iniciar sesión antes de predecir.");
    return;
  }

  const { error } = await client.from("predicciones").insert({
    partido_id: partidoId,
    prediccion_marcador_a: parseInt(marcadorA),
    prediccion_marcador_b: parseInt(marcadorB),
    usuario_id: user.id,
  });

  if (error) {
    console.error("Error guardando predicción:", error);
    alert("Hubo un error guardando tu predicción.");
    return;
  }

  alert("¡Predicción guardada!");
}

cargarPartidos();
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const usuarioActualTexto = document.getElementById("usuario-actual");
const formLogin = document.getElementById("form-login");
const btnLogout = document.getElementById("btn-logout");

document.getElementById("btn-registrarme").addEventListener("click", async () => {
  const { error } = await client.auth.signUp({
    email: emailInput.value,
    password: passwordInput.value,
  });
  if (error) {
    alert("Error al registrarse: " + error.message);
    return;
  }
  alert("¡Registrado! Ya podés predecir.");
  actualizarEstadoUsuario();
});

document.getElementById("btn-login").addEventListener("click", async () => {
  const { error } = await client.auth.signInWithPassword({
    email: emailInput.value,
    password: passwordInput.value,
  });
  if (error) {
    alert("Error al iniciar sesión: " + error.message);
    return;
  }
  actualizarEstadoUsuario();
});

btnLogout.addEventListener("click", async () => {
  await client.auth.signOut();
  actualizarEstadoUsuario();
});

async function actualizarEstadoUsuario() {
  const { data: { user } } = await client.auth.getUser();

  if (user) {
    usuarioActualTexto.textContent = "Conectado como: " + user.email;
    formLogin.querySelectorAll("input, #btn-registrarme, #btn-login").forEach(el => el.style.display = "none");
    btnLogout.style.display = "inline-block";
  } else {
    usuarioActualTexto.textContent = "";
    formLogin.querySelectorAll("input, #btn-registrarme, #btn-login").forEach(el => el.style.display = "inline-block");
    btnLogout.style.display = "none";
  }
}

actualizarEstadoUsuario();

async function poblarSelectPartidos() {
  const { data: partidos, error } = await client.from("partidos").select("*");
  if (error) {
    console.error("Error trayendo partidos para el select:", error);
    return;
  }

  const select = document.getElementById("select-partido");
  select.innerHTML = "";
  partidos.forEach((partido) => {
    const opcion = document.createElement("option");
    opcion.value = partido.id;
    opcion.textContent = `${partido.equipo_a} vs ${partido.equipo_b}`;
    select.appendChild(opcion);
  });
}

document.getElementById("btn-cargar-resultado").addEventListener("click", async () => {
  const partidoId = document.getElementById("select-partido").value;
  const resultadoA = parseInt(document.getElementById("resultado-a").value);
  const resultadoB = parseInt(document.getElementById("resultado-b").value);

  if (isNaN(resultadoA) || isNaN(resultadoB)) {
    alert("Completá los dos marcadores del resultado real.");
    return;
  }

  // 1. Actualizamos el partido con el resultado real
  const { error: errorPartido } = await client
    .from("partidos")
    .update({
      marcador_equipo_a: resultadoA,
      marcador_equipo_b: resultadoB,
      estado_partido: "Finalizado",
    })
    .eq("id", partidoId);

  if (errorPartido) {
    console.error("Error actualizando partido:", errorPartido);
    alert("Hubo un error guardando el resultado.");
    return;
  }

  // 2. Traemos todas las predicciones de ese partido
  const { data: predicciones, error: errorPred } = await client
    .from("predicciones")
    .select("*")
    .eq("partido_id", partidoId);

  if (errorPred) {
    console.error("Error trayendo predicciones:", errorPred);
    return;
  }

  const ganadorReal =
    resultadoA > resultadoB ? "A" : resultadoB > resultadoA ? "B" : "Empate";

  // 3. Calculamos y guardamos los puntos de cada predicción
  for (const prediccion of predicciones) {
    const ganadorPredicho =
      prediccion.prediccion_marcador_a > prediccion.prediccion_marcador_b
        ? "A"
        : prediccion.prediccion_marcador_b > prediccion.prediccion_marcador_a
        ? "B"
        : "Empate";

    let puntos = 0;
    const acertoMarcadorExacto =
      prediccion.prediccion_marcador_a === resultadoA &&
      prediccion.prediccion_marcador_b === resultadoB;

    if (acertoMarcadorExacto) {
      puntos = 3;
    } else if (ganadorPredicho === ganadorReal) {
      puntos = 1;
    }

    await client
      .from("predicciones")
      .update({ puntos_ganados: puntos })
      .eq("id", prediccion.id);
  }

  alert("¡Resultado cargado y puntos calculados!");
  cargarPartidos();
});

poblarSelectPartidos();

async function cargarRanking() {
  const { data: predicciones, error } = await client
    .from("predicciones")
    .select("usuario_id, puntos_ganados")
    .not("puntos_ganados", "is", null);

  if (error) {
    console.error("Error trayendo predicciones para el ranking:", error);
    return;
  }

  const { data: profiles, error: errorProfiles } = await client
    .from("profiles")
    .select("id, email");

  if (errorProfiles) {
    console.error("Error trayendo profiles:", errorProfiles);
    return;
  }

  // Sumamos los puntos de cada usuario
  const puntosPorUsuario = {};
  predicciones.forEach((p) => {
    if (!puntosPorUsuario[p.usuario_id]) {
      puntosPorUsuario[p.usuario_id] = 0;
    }
    puntosPorUsuario[p.usuario_id] += p.puntos_ganados;
  });

  // Armamos una lista con nombre + puntos, y la ordenamos de mayor a menor
  const ranking = Object.keys(puntosPorUsuario).map((usuarioId) => {
    const profile = profiles.find((p) => p.id === usuarioId);
    return {
      email: profile ? profile.email : "Usuario desconocido",
      puntos: puntosPorUsuario[usuarioId],
    };
  });

  ranking.sort((a, b) => b.puntos - a.puntos);

  const contenedor = document.getElementById("lista-ranking");
  contenedor.innerHTML = "";
  ranking.forEach((item, index) => {
    const fila = document.createElement("div");
    fila.textContent = `${index + 1}. ${item.email} — ${item.puntos} puntos`;
    contenedor.appendChild(fila);
  });
}

cargarRanking();