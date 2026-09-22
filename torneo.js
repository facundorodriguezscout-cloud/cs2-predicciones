const SUPABASE_URL = "https://bygbnwnrwdrylkehucpo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_G6_Di3Gmi-Ty5TM-RFg4Ew_KkiQQvYa";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Leemos el "id" del torneo desde la URL (ej: torneo.html?id=xxxx)
const params = new URLSearchParams(window.location.search);
const torneoId = params.get("id");

async function cargarDetalleTorneo() {
  if (!torneoId) {
    document.getElementById("nombre-torneo").textContent = "Torneo no especificado";
    return;
  }

  // Traemos la info del torneo, incluyendo a qué otro torneo clasifica (si aplica)
  const { data: torneo, error } = await client
    .from("torneos")
    .select("*, clasifica_a(id, nombre)")
    .eq("id", torneoId)
    .single();

  if (error || !torneo) {
    console.error("Error trayendo el torneo:", error);
    document.getElementById("nombre-torneo").textContent = "Torneo no encontrado";
    return;
  }

  document.getElementById("nombre-torneo").textContent = torneo.nombre;

  let infoTexto = `Formato: ${torneo.formato || "No especificado"} — Premio: ${torneo.premio || "No especificado"}`;
  if (torneo.clasifica_a) {
    infoTexto += ` — El campeón clasifica a: ${torneo.clasifica_a.nombre}`;
  }
  document.getElementById("info-torneo").textContent = infoTexto;

  // Traemos los equipos participantes
    // Traemos los equipos participantes
  const { data: equipos } = await client
    .from("torneo_equipos")
    .select("*")
    .eq("torneo_id", torneoId);

  const contenedorEquipos = document.getElementById("lista-equipos");
  contenedorEquipos.innerHTML = "";

  // Agrupamos los equipos por su récord (estado)
  const grupos = {};
  (equipos || []).forEach((equipo) => {
    const record = equipo.estado || "Sin definir";
    if (!grupos[record]) grupos[record] = [];
    grupos[record].push(equipo.nombre_equipo);
  });

  Object.keys(grupos).sort().forEach((record) => {
    const columna = document.createElement("div");
    columna.classList.add("columna-record");

    const titulo = document.createElement("h4");
    titulo.textContent = record;
    columna.appendChild(titulo);

    grupos[record].forEach((nombreEquipo) => {
      const item = document.createElement("div");
      item.classList.add("equipo-item");
      item.textContent = nombreEquipo;
      columna.appendChild(item);
    });

    contenedorEquipos.appendChild(columna);
  });
}

cargarDetalleTorneo();
