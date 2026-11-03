// --- Navegacion por scroll ---
// Las secciones estan apiladas verticalmente y el fondo 3D hace morphing
// siguiendo la posicion del scroll: script.js mide que trozo de la pagina
// se esta viendo y le pasa la mezcla (parA, parB, t) a three.js, que escribe
// las posiciones 3D interpoladas con su propio motor (window.establecerMezcla).
const ORDEN_SECCIONES = ["#inicio", "#panel-proyectos", "#panel-informacion", "#panel-contacto"];
const secciones = ORDEN_SECCIONES.map((sel) => document.querySelector(sel)).filter(Boolean);
const enlacesNav = [...document.querySelectorAll(".enlaceNav")];

const prefieraMovimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");

let tops = [];
function medir() {
  tops = secciones.map((s) => s.offsetTop);
}
medir();
window.addEventListener("resize", medir);
window.addEventListener("load", () => {
  medir();
  actualizar();
});

// Clic en enlaces/anclas -> scroll suave a la seccion
document.querySelectorAll('a[href^="#"]').forEach((enlace) => {
  enlace.addEventListener("click", (evento) => {
    const destino = enlace.getAttribute("href");
    const objetivo = destino && destino !== "#" ? document.querySelector(destino) : null;
    if (!objetivo) return;

    evento.preventDefault();
    objetivo.scrollIntoView({ behavior: prefieraMovimientoReducido.matches ? "auto" : "smooth" });
    history.replaceState(null, "", destino);
  });
});

const UMBRAL_LOGO = 60;

// --- Instrumentos del marco: contador y leyenda de seccion ---
const ETIQUETAS_SECCION = ["PORTADA", "PROYECTOS", "INFORMACIÓN", "CONTACTO"];
const contadorActual = document.getElementById("contadorActual");
const leyendaSeccion = document.getElementById("leyendaSeccion");
let activoAnterior = -1;

function actualizarInstrumentos(activo) {
  const numero = String(activo + 1).padStart(2, "0");

  if (contadorActual) {
    contadorActual.textContent = numero;
    if (!prefieraMovimientoReducido.matches) {
      gsap.fromTo(contadorActual, { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.25, ease: "power1.out" });
    }
  }

  if (leyendaSeccion) {
    leyendaSeccion.textContent = "SEC." + numero + " — " + (ETIQUETAS_SECCION[activo] || "");
    if (!prefieraMovimientoReducido.matches) {
      gsap.fromTo(leyendaSeccion, { opacity: 0, x: 6 },
        { opacity: 1, x: 0, duration: 0.25, ease: "power1.out" });
    }
  }
}

function actualizar() {
  const y = window.scrollY;
  const n = secciones.length;
  if (n === 0) return;

  // Posicion global continua: 0.0 = portada, 1.0 = proyectos, etc.
  let gt = 0;
  if (y >= tops[n - 1]) {
    gt = n - 1;
  } else if (y > 0) {
    for (let k = 0; k < n - 1; k++) {
      const desde = Math.max(tops[k], 0);
      const hasta = tops[k + 1];
      if (y < hasta) {
        gt = k + (y - desde) / Math.max(1, hasta - desde);
        break;
      }
    }
  }

  // Seccion activa: la ultima cuyo top ya paso el 40% del viewport.
  // Responde cuando la seccion entra en pantalla, no a mitad del trayecto
  // entre secciones (que era la causa del desfase con el scroll).
  const vh = window.innerHeight || 1;
  let activo = 0;
  for (let i = 0; i < n; i++) {
    if (tops[i] - y <= vh * 0.4) activo = i;
  }
  secciones.forEach((s, i) => s.classList.toggle("active", i === activo));

  // Progreso continuo del recorrido (0 = portada, 1 = contacto): alimenta
  // la linea del marco y la fase lunar, que lo leen por CSS.
  document.documentElement.style.setProperty(
    "--progresoScroll",
    (n > 1 ? gt / (n - 1) : 0).toFixed(4)
  );

  if (activo !== activoAnterior) {
    activoAnterior = activo;
    actualizarInstrumentos(activo);
  }

  for (const enlace of enlacesNav) {
    enlace.classList.toggle("activo", secciones[activo]
      && enlace.getAttribute("href") === "#" + secciones[activo].id);
  }

  document.body.classList.toggle("enCima", y < UMBRAL_LOGO);

  // Motor 3D: mezcla directa entre el par de estados ponderado por gt
  if (typeof window.establecerMezcla === "function") {
    if (gt >= n - 1) {
      window.establecerMezcla(n - 1, n - 1, 0);
    } else {
      const iA = Math.floor(gt);
      window.establecerMezcla(iA, iA + 1, gt - iA);
    }
  }
}

let marcando = false;
window.addEventListener("scroll", () => {
  if (marcando) return;
  marcando = true;
  requestAnimationFrame(() => {
    marcando = false;
    actualizar();
  });
}, { passive: true });

actualizar();

// --- Panel de proyectos ---
// Usamos una función para obtener siempre los botones actuales (se recrean tras cargar la API)
function getBotonesProyecto() {
  return [...document.querySelectorAll(".botonProyectos")];
}

const detalleTitulo = document.getElementById("detalle-titulo");
const detalleFecha = document.getElementById("detalle-fecha");
const detalleDescripcion = document.getElementById("detalle-descripcion");
const detalleImagen = document.getElementById("detalle-imagen");
const detalleTags = document.getElementById("detalle-tags");
const detalleEnlace = document.getElementById("detalle-enlace");
const REPO_POR_DEFECTO = "https://github.com/HVT-IAN";

function mostrarProyecto(boton) {
  for (const b of getBotonesProyecto()) b.classList.toggle("active", b === boton);

  const bloque = boton.closest(".itemBoton");
  const fecha = bloque && bloque.querySelector(".fechaBoton");
  const descripcion = bloque && bloque.querySelector(".descripcionBoton");
  const titulo = boton.textContent.trim();

  if (detalleTitulo) detalleTitulo.textContent = titulo;
  if (detalleFecha) detalleFecha.textContent = fecha ? fecha.textContent.trim() : "";
  if (detalleDescripcion) {
    detalleDescripcion.textContent = descripcion ? descripcion.textContent.trim() : "";
  }

  if (detalleTags && bloque) {
    detalleTags.textContent = "";
    const listaTags = bloque.querySelectorAll(".tagsProyecto li");
    for (const tag of listaTags) {
      const li = document.createElement("li");
      li.textContent = tag.textContent.trim();
      detalleTags.appendChild(li);
    }
  }

  if (detalleEnlace) {
    detalleEnlace.href = boton.dataset.repo || REPO_POR_DEFECTO;
  }

  if (!detalleImagen) return;

  const src = boton.dataset.imagen;
  if (src) {
    detalleImagen.src = src;
    detalleImagen.alt = "Imagen de " + titulo;
    detalleImagen.hidden = false;
  } else {
    detalleImagen.removeAttribute("src");
    detalleImagen.hidden = true;
  }
}

for (const boton of getBotonesProyecto()) {
  boton.addEventListener("click", () => mostrarProyecto(boton));
}

const proyectoInicial = getBotonesProyecto().find((b) => b.classList.contains("active"))
  || getBotonesProyecto()[0];
if (proyectoInicial) mostrarProyecto(proyectoInicial);

// --- Rejilla de puntos pulsantes del fondo ---
const contenedorOndas = document.querySelector(".gridOndas");

function pintarOndas() {
  if (!contenedorOndas) return;

  const columnas = getComputedStyle(contenedorOndas)
    .gridTemplateColumns
    .split(" ")
    .filter(Boolean)
    .length;

  const necesarias = columnas * 15;

  if (contenedorOndas.childElementCount === necesarias) return;

  contenedorOndas.textContent = "";
  const fragmento = document.createDocumentFragment();
  for (let i = 0; i < necesarias; i++) {
    fragmento.appendChild(document.createElement("span"));
  }
  contenedorOndas.appendChild(fragmento);
}

pintarOndas();
window.addEventListener("resize", pintarOndas);



// ===== CONEXIÓN AL BACKEND =====
// En local usa FastAPI; en producción, la URL pública de Render.
// Cambia API_PRODUCCION cuando ya tengas tu servicio desplegado.
const API_PRODUCCION = "https://cms-landingandblog.onrender.com/api/v1/public";
const esLocal = location.hostname === "127.0.0.1"
  || location.hostname === "localhost"
  || location.protocol === "file:";
const API_BASE = esLocal ? "http://127.0.0.1:8000/api/v1/public" : API_PRODUCCION;

// Elementos del hero / settings para actualizar dinámicamente
const heroTitle = document.querySelector("#inicio h1.FuenteTitulos");
const heroSubtitle = document.querySelector("#inicio h3.subtituloTitulo");
const heroHook = document.querySelector("#inicio p.ganchoHero");
const availability = document.querySelector("#inicio p.estadoDisponibilidad");
const ctaPrimary = document.querySelector("#inicio .accionesHero a:first-child");
const ctaSecondary = document.querySelector("#inicio .accionesHero a:last-child");
const contactTitle = document.querySelector("#panel-contacto h2.fuenteSecundaria");
const contactText = document.querySelector("#panel-contacto p.SeccionInformacion");

function aplicarSettings(s) {
  if (!s) return;
  if (s.heroTitle) heroTitle.textContent = s.heroTitle;
  if (s.heroSubtitle) heroSubtitle.textContent = s.heroSubtitle;
  if (s.heroHook) heroHook.textContent = s.heroHook;
  if (s.availability) availability.textContent = s.availability;
  if (s.ctaPrimary) ctaPrimary.textContent = s.ctaPrimary;
  if (s.ctaSecondary) ctaSecondary.textContent = s.ctaSecondary;
  if (s.contactTitle) contactTitle.textContent = s.contactTitle;
  if (s.contactText) contactText.textContent = s.contactText;
}

// Carga datos de la API y pinta la página
async function cargarDatosIniciales() {
  try {
    const respuesta = await fetch(API_BASE + "/landing");
    if (!respuesta.ok) throw new Error("Error " + respuesta.status);
    const datos = await respuesta.json();

    // 1. Proyectos
    if (datos.projects && datos.projects.length) {
      pintarProyectos(datos.projects);
    }

    // 2. Tecnologías (skillGroups)
    if (datos.skillGroups && datos.skillGroups.length) {
      pintarTecnologias(datos.skillGroups);
    }
    // 3. Redes sociales
    if (datos.socialLinks && datos.socialLinks.length) {
      pintarRedes(datos.socialLinks);
    }
    // 4. Hero / settings dinámicos
    if (datos.settings) {
      aplicarSettings(datos.settings);
    }
    // 5. Formulario de contacto (se engancha al final para asegurar que el DOM existe)
    initFormularioContacto();
  } catch (e) {
    console.error("No se pudo cargar la API:", e);
    // Si falla, la página sigue funcionando con el HTML hardcodeado
    initFormularioContacto(); // también intentamos enganchar el form aunque falle la API
  }
}

document.addEventListener("DOMContentLoaded", cargarDatosIniciales);

function pintarProyectos(proyectos) {
  // El contenedor real en el HTML: .listaProyectos
  const contenedor = document.querySelector(".listaProyectos");
  if (!contenedor) return;

  // DEBUG: ver qué llega de la API
  console.log("🔍 pintarProyectos recibido:", proyectos);

  // Si no hay proyectos publicados, NO vaciamos el contenedor (deja los hardcodeados)
  if (!proyectos || !proyectos.length) {
    console.warn("⚠️ No hay proyectos publicados — manteniendo hardcodeados");
    return;
  }

  // Guardamos el primer botón para marcarlo active
  let primerBoton = null;

  // Vaciamos el contenedor (borra los botones hardcodeados)
  contenedor.innerHTML = "";

  proyectos.forEach((p, i) => {
    // Creamos la estructura que tu CSS/JS espera:
    // <div class="itemBoton">
    //   <button class="botonProyectos" data-imagen="..." data-repo="...">Título</button>
    //   <h6 class="fechaBoton">Fecha</h6>
    //   <p class="descripcionBoton">Descripción</p>
    //   <ul class="tagsProyecto"><li>Tag1</li>...</ul>
    // </div>

    const item = document.createElement("div");
    item.className = "itemBoton";

    const btn = document.createElement("button");
    btn.className = "botonProyectos";
    btn.textContent = p.title;
    btn.dataset.imagen = p.image?.url || "";
    btn.dataset.repo = p.repoUrl || "https://github.com/HVT-IAN";
    if (i === 0) btn.classList.add("active"); // el primero active
    if (i === 0) primerBoton = btn;

    const fecha = document.createElement("h6");
    fecha.className = "fechaBoton";
    fecha.textContent = p.dateLabel || "";

    const desc = document.createElement("p");
    desc.className = "descripcionBoton";
    desc.textContent = p.description || "";

    const tagsUl = document.createElement("ul");
    tagsUl.className = "tagsProyecto";
    (p.tags || []).forEach(t => {
      const li = document.createElement("li");
      li.textContent = t;
      tagsUl.appendChild(li);
    });

    item.append(btn, fecha, desc, tagsUl);
    contenedor.appendChild(item);
  });

  // Re-enganchar los eventos click a los NUEVOS botones
  const nuevosBotones = [...document.querySelectorAll(".botonProyectos")];
  nuevosBotones.forEach(b => {
    b.addEventListener("click", () => mostrarProyecto(b));
  });

  // Mostrar el primero (reutiliza tu función existente)
  if (primerBoton) mostrarProyecto(primerBoton);
}

function pintarTecnologias(grupos) {
  // Contenedor real en el HTML: .gruposTecnologias
  const contenedor = document.querySelector(".gruposTecnologias");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  // Skills que tienen archivo SVG en /img/
  const skillsConIcono = ["html", "css", "javascript", "cpp", "c++", "python", "react", "vue", "tailwind", "typescript", "node", "git"];

  grupos.forEach(grupo => {
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "grupoTecnologia";

    const h4 = document.createElement("h4");
    h4.textContent = grupo.name;
    grupoDiv.appendChild(h4);

    const ul = document.createElement("ul");
    ul.className = "listaTecnologias";

    grupo.skills.forEach(skill => {
      const li = document.createElement("li");
      const skillLower = skill.toLowerCase();
      const tieneIcono = skillsConIcono.some(s => skillLower.includes(s));

      if (tieneIcono) {
        const img = document.createElement("img");
        img.className = "iconoTecnologia";
        img.alt = skill;
        img.width = 40;
        img.height = 40;
        // Mapea nombre a archivo SVG en /img/
        let archivo = skillLower
          .replace("c++", "cpp")
          .replace("c#", "csharp")
          .replace(" ", "-")
          .replace(".", "") + ".svg";
        // Casos especiales
        if (skillLower === "html") archivo = "html5.svg";
        if (skillLower === "css") archivo = "css3.svg";
        if (skillLower === "javascript" || skillLower === "js") archivo = "javascript.svg";
        img.src = "img/" + archivo;
        li.appendChild(img);
      } else {
        li.className = "chipTech";
        li.textContent = skill;
      }
      ul.appendChild(li);
    });

    grupoDiv.appendChild(ul);
    contenedor.appendChild(grupoDiv);
  });
}

function pintarRedes(redes) {
  // Mapa: platform (de la API) -> selector CSS del botón/enlace en el HTML
  const mapaContacto = {
    github: '.grupoContacto a[href*="github"]',
    instagram: '.grupoContacto a[href*="instagram"]',
    linkedin: '.grupoContacto a[href*="linkedin"]',
    email: '.grupoContacto a[href^="mailto"]'
  };

  const mapaFijo = {
    github: '.iconosContacto a[href*="github"]',
    instagram: '.iconosContacto a[href*="instagram"]'
  };

  redes.forEach(r => {
    const platform = r.platform.toLowerCase();

    // Actualiza botones en la sección Contacto
    const selContacto = mapaContacto[platform];
    if (selContacto) {
      const a = document.querySelector(selContacto);
      if (a) a.href = r.url;
    }

    // Actualiza iconos fijos en la barra superior
    const selFijo = mapaFijo[platform];
    if (selFijo) {
      const a = document.querySelector(selFijo);
      if (a) a.href = r.url;
    }
  });
}

// Inicializa el formulario de contacto (se llama tras cargar la API)
function initFormularioContacto() {
  const formContacto = document.querySelector("#form-contacto");
  if (!formContacto) return;

  formContacto.addEventListener("submit", async (e) => {
    e.preventDefault(); // evita recarga / envío por GET

    const btn = formContacto.querySelector('button[type="submit"]');
    const textoOriginal = btn?.textContent;
    btn && (btn.disabled = true, btn.textContent = "Enviando...");

    const data = {
      name: formContacto.name?.value?.trim() || "",
      email: formContacto.email?.value?.trim() || "",
      message: formContacto.message?.value?.trim() || "",
      website: "" // honeypot vacío
    };

    try {
      const resp = await fetch(API_BASE + "/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const resultado = await resp.json();
      if (resultado.ok) {
        alert("✅ Mensaje enviado correctamente");
        formContacto.reset();
      } else {
        alert("❌ Error: " + (resultado.detail || "Intenta de nuevo"));
      }
    } catch (err) {
      console.error(err);
      alert("❌ No se pudo conectar con el servidor");
    } finally {
      btn && (btn.disabled = false, btn.textContent = textoOriginal);
    }
  });
}