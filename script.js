const SUPABASE_URL = "https://bygbnwnrwdrylkehucpo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_G6_Di3Gmi-Ty5TM-RFg4Ew_KkiQQvYa";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cargarPartidos() {
  const { data: partidos, error } = await client
    .from("partidos")
    .select("*, torneos(id, nombre)")
    .order("torneo_id", { ascending: true })
    .order("fecha_partido", { ascending: true });

  if (error) {
    console.error("Error trayendo partidos:", error);
    return;
  }

  const contenedor = document.getElementById("lista-partidos");
  contenedor.innerHTML = "";

  let torneoActual = undefined;

  partidos.forEach((partido) => {
    if (partido.torneo_id !== torneoActual) {
      torneoActual = partido.torneo_id;
      const subtitulo = document.createElement("h3");

      if (partido.torneos) {
        const link = document.createElement("a");
        link.href = `torneo.html?id=${partido.torneos.id}`;
        link.textContent = partido.torneos.nombre;
        subtitulo.appendChild(link);
      } else {
        subtitulo.textContent = "Sin torneo asignado";
      }

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
  const panelAdmin = document.getElementById("admin-resultado");

  if (user) {
    usuarioActualTexto.textContent = "Conectado como: " + user.email;
    formLogin.querySelectorAll("input, #btn-registrarme, #btn-login").forEach(el => el.style.display = "none");
    btnLogout.style.display = "inline-block";
    document.getElementById("panel-equipo-nuevo").style.display = (profile && profile.rol === "admin") ? "block" : "none";
document.getElementById("panel-partido-nuevo").style.display = (profile && profile.rol === "admin") ? "block" : "none";

    const { data: profile } = await client
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    panelAdmin.style.display = (profile && profile.rol === "admin") ? "block" : "none";
    document.getElementById("panel-torneo-nuevo").style.display = (profile && profile.rol === "admin") ? "block" : "none";
  } else {
    usuarioActualTexto.textContent = "";
    formLogin.querySelectorAll("input, #btn-registrarme, #btn-login").forEach(el => el.style.display = "inline-block");
    btnLogout.style.display = "none";
    panelAdmin.style.display = "none";
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

document.getElementById("btn-crear-torneo").addEventListener("click", async () => {
  const nombre = document.getElementById("nuevo-torneo-nombre").value;
  const formato = document.getElementById("nuevo-torneo-formato").value;
  const premio = document.getElementById("nuevo-torneo-premio").value;

  if (!nombre) {
    alert("El torneo necesita al menos un nombre.");
    return;
  }

  const { error } = await client.from("torneos").insert({
    nombre,
    formato,
    premio,
  });

  if (error) {
    console.error("Error creando torneo:", error);
    alert("Hubo un error creando el torneo.");
    return;
  }

  alert("¡Torneo creado!");
  document.getElementById("nuevo-torneo-nombre").value = "";
  document.getElementById("nuevo-torneo-formato").value = "";
  document.getElementById("nuevo-torneo-premio").value = "";
});

async function poblarSelectsTorneos() {
  const { data: torneos, error } = await client.from("torneos").select("id, nombre");
  if (error) {
    console.error("Error trayendo torneos:", error);
    return;
  }

  [document.getElementById("select-torneo-equipo"), document.getElementById("select-torneo-partido")]
    .forEach((select) => {
      select.innerHTML = "";
      torneos.forEach((torneo) => {
        const opcion = document.createElement("option");
        opcion.value = torneo.id;
        opcion.textContent = torneo.nombre;
        select.appendChild(opcion);
      });
    });
}

document.getElementById("btn-agregar-equipo").addEventListener("click", async () => {
  const torneoId = document.getElementById("select-torneo-equipo").value;
  const nombreEquipo = document.getElementById("nuevo-equipo-nombre").value;
  const estado = document.getElementById("nuevo-equipo-estado").value || "0-0";

  if (!nombreEquipo) {
    alert("Falta el nombre del equipo.");
    return;
  }

  const { error } = await client.from("torneo_equipos").insert({
    torneo_id: torneoId,
    nombre_equipo: nombreEquipo,
    estado,
  });

  if (error) {
    console.error("Error agregando equipo:", error);
    alert("Hubo un error agregando el equipo.");
    return;
  }

  alert("¡Equipo agregado!");
  document.getElementById("nuevo-equipo-nombre").value = "";
  document.getElementById("nuevo-equipo-estado").value = "";
});

document.getElementById("btn-crear-partido").addEventListener("click", async () => {
  const torneoId = document.getElementById("select-torneo-partido").value;
  const equipoA = document.getElementById("nuevo-partido-equipo-a").value;
  const equipoB = document.getElementById("nuevo-partido-equipo-b").value;
  const fecha = document.getElementById("nuevo-partido-fecha").value;

  if (!equipoA || !equipoB || !fecha) {
    alert("Completá equipo A, equipo B y la fecha.");
    return;
  }

  const { error } = await client.from("partidos").insert({
    torneo_id: torneoId,
    equipo_a: equipoA,
    equipo_b: equipoB,
    fecha_partido: fecha,
    estado_partido: "Programado",
  });

  if (error) {
    console.error("Error creando partido:", error);
    alert("Hubo un error creando el partido.");
    return;
  }

  alert("¡Partido creado!");
  document.getElementById("nuevo-partido-equipo-a").value = "";
  document.getElementById("nuevo-partido-equipo-b").value = "";
  document.getElementById("nuevo-partido-fecha").value = "";
  cargarPartidos();
  poblarSelectPartidos();
});

poblarSelectsTorneos();
