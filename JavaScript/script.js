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
  for (const b of getBotonesProyecto()) {
    const activo = b === boton;
    b.classList.toggle("active", activo);
    b.setAttribute("aria-pressed", activo ? "true" : "false");
  }

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

// ===== Caché local y pantalla de carga =====
const CACHE_KEY = "actmijangos:landing:v1";
const CACHE_VERSION = 1;

const pantallaCarga = document.getElementById("pantallaCarga");
const pantallaCargaTexto = document.getElementById("pantallaCargaTexto");
const pantallaCargaError = document.getElementById("pantallaCargaError");
const reintentarCarga = document.getElementById("reintentarCarga");
const contenidoPrincipal = document.querySelector("main");
const barraNavegacion = document.querySelector(".barraNavegacion");
const iconosContacto = document.querySelector(".iconosContacto");

let cargaEnCurso = false;
let landingIniciada = false;
let temporizadorAviso = null;

function leerCache() {
  try {
    const crudo = localStorage.getItem(CACHE_KEY);
    if (!crudo) return null;
    const guardado = JSON.parse(crudo);
    if (!guardado || guardado.version !== CACHE_VERSION || !guardado.data) return null;
    return guardado.data;
  } catch (error) {
    return null;
  }
}

function guardarCache(datos) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      version: CACHE_VERSION,
      guardadoEn: Date.now(),
      data: datos
    }));
  } catch (error) {
    // localStorage puede estar lleno o bloqueado (modo privado).
  }
}

function bloquearContenido(bloqueado) {
  [contenidoPrincipal, barraNavegacion, iconosContacto].forEach((elemento) => {
    if (!elemento) return;
    if ("inert" in elemento) elemento.inert = bloqueado;
  });
}

function iniciarPantallaCarga() {
  document.documentElement.classList.add("cargando");
  bloquearContenido(true);
  pantallaCarga?.classList.remove("pantallaCarga--error");

  if (pantallaCargaTexto) {
    pantallaCargaTexto.textContent = "Cargando contenido";
  }
  if (pantallaCargaError) {
    pantallaCargaError.hidden = true;
    pantallaCargaError.textContent = "";
  }
  if (reintentarCarga) {
    reintentarCarga.hidden = true;
  }

  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    if (document.documentElement.classList.contains("cargando") && pantallaCargaTexto) {
      pantallaCargaTexto.textContent = "El servidor está despertando. Puede tardar hasta un minuto.";
    }
  }, 8000);
}

function terminarPantallaCarga() {
  clearTimeout(temporizadorAviso);
  document.documentElement.classList.remove("cargando");
  bloquearContenido(false);
}

function mostrarErrorCarga(mensaje) {
  clearTimeout(temporizadorAviso);
  document.documentElement.classList.add("cargando");
  bloquearContenido(true);
  pantallaCarga?.classList.add("pantallaCarga--error");

  if (pantallaCargaTexto) {
    pantallaCargaTexto.textContent = "No se pudo cargar el contenido";
  }
  if (pantallaCargaError) {
    pantallaCargaError.textContent = mensaje;
    pantallaCargaError.hidden = false;
  }
  if (reintentarCarga) {
    reintentarCarga.hidden = false;
  }
}

// ===== Settings / SEO =====
function aplicarSettings(s) {
  if (!s) return;

  if (s.heroTitle && heroTitle) heroTitle.textContent = s.heroTitle;
  if (s.heroSubtitle && heroSubtitle) heroSubtitle.textContent = s.heroSubtitle;
  if (s.heroHook && heroHook) heroHook.textContent = s.heroHook;
  if (s.availability && availability) {
    availability.textContent = "";
    const punto = document.createElement("span");
    punto.className = "puntoEstado";
    punto.setAttribute("aria-hidden", "true");
    availability.append(punto, document.createTextNode(s.availability));
  }
  if (s.ctaPrimary && ctaPrimary) ctaPrimary.textContent = s.ctaPrimary;
  if (s.ctaSecondary && ctaSecondary) ctaSecondary.textContent = s.ctaSecondary;
  if (s.contactTitle && contactTitle) contactTitle.textContent = s.contactTitle;
  if (s.contactText && contactText) contactText.textContent = s.contactText;

  if (s.contactEmail) {
    document.querySelectorAll('a[href^="mailto:"]').forEach((enlace) => {
      enlace.href = "mailto:" + s.contactEmail;
      enlace.style.display = "";
    });
  }

  if (s.seoTitle) {
    document.title = s.seoTitle;
  }

  if (s.metaDescription) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = s.metaDescription;
  }

  if (s.faviconUrl) {
    const icono = document.querySelector('link[rel="icon"]');
    if (icono) icono.href = s.faviconUrl;
  }

  if (s.frameText) {
    const leyenda = document.querySelector(".leyendaHorizontal");
    if (leyenda) leyenda.textContent = s.frameText;
  }

  if (s.latitude || s.longitude) {
    const coordenadas = document.querySelector(".leyendaCoordenadas");
    if (coordenadas) {
      const partes = [];
      if (s.latitude) partes.push("N " + s.latitude + "°");
      if (s.longitude) partes.push("W " + s.longitude + "°");
      if (partes.length) coordenadas.textContent = partes.join(" · ") + " — TUXTLA GTZ.";
    }
  }
}

// ===== Renderizado completo =====
function aplicarDatos(datos) {
  if (!datos || typeof datos !== "object") return;

  if (Array.isArray(datos.projects)) pintarProyectos(datos.projects);
  if (Array.isArray(datos.skillGroups)) pintarTecnologias(datos.skillGroups);
  if (datos.about) pintarAbout(datos.about);
  if (Array.isArray(datos.socialLinks)) pintarRedes(datos.socialLinks);
  if (datos.settings) aplicarSettings(datos.settings);

  // El contenido cambió de altura: recalcular posiciones para el scroll
  // y el morphing de Three.js.
  requestAnimationFrame(() => {
    medir();
    actualizar();
  });
}

// ===== Carga de datos: caché primero, luego red =====
const TIEMPO_MAXIMO_PETICION = 70000; // Render free puede tardar ~50 s en despertar

async function pedirLanding() {
  const controlador = new AbortController();
  const limite = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_PETICION);

  try {
    const respuesta = await fetch(API_BASE + "/landing", {
      signal: controlador.signal,
      headers: { Accept: "application/json" }
    });
    if (!respuesta.ok) throw new Error("Error " + respuesta.status);
    return await respuesta.json();
  } finally {
    clearTimeout(limite);
  }
}

async function cargarDatosIniciales() {
  if (cargaEnCurso) return;

  const cache = leerCache();
  if (cache) {
    // Recarga: mostramos al instante el último contenido válido y luego
    // revalidamos contra la API sin volver a tapar la página.
    try {
      aplicarDatos(cache);
    } catch (error) {
      console.error("La caché local no se pudo pintar:", error);
    }
    terminarPantallaCarga();
  } else {
    iniciarPantallaCarga();
  }

  cargaEnCurso = true;

  try {
    const datos = await pedirLanding();
    aplicarDatos(datos);
    guardarCache(datos);
    terminarPantallaCarga();
  } catch (error) {
    console.error("No se pudo cargar la API:", error);

    if (cache) {
      // Ya hay contenido válido en pantalla: se conserva la caché.
      terminarPantallaCarga();
    } else {
      mostrarErrorCarga(
        error.name === "AbortError"
          ? "La conexión tardó demasiado. Revisa tu internet e inténtalo de nuevo."
          : "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."
      );
    }
  } finally {
    cargaEnCurso = false;
  }
}

function iniciarLanding() {
  if (landingIniciada) return;
  landingIniciada = true;

  // El formulario se engancha de inmediato, sin esperar a la API.
  initFormularioContacto();

  // Si una imagen dinámica cambia la altura del contenido, recalcular el
  // scroll y la mezcla de Three.js.
  document.querySelectorAll("#detalle-imagen, #about-foto").forEach((imagen) => {
    imagen.addEventListener("load", () => {
      medir();
      actualizar();
    });
  });

  reintentarCarga?.addEventListener("click", () => {
    if (cargaEnCurso) return;
    iniciarPantallaCarga();
    cargarDatosIniciales();
  });

  cargarDatosIniciales();
}

function limpiarDetalleProyecto() {
  if (detalleTitulo) detalleTitulo.textContent = "";
  if (detalleFecha) detalleFecha.textContent = "";
  if (detalleDescripcion) detalleDescripcion.textContent = "";
  if (detalleTags) detalleTags.textContent = "";
  if (detalleImagen) {
    detalleImagen.removeAttribute("src");
    detalleImagen.alt = "";
    detalleImagen.hidden = true;
  }
  if (detalleEnlace) detalleEnlace.hidden = true;
}

function pintarProyectos(proyectos) {
  // El contenedor real en el HTML: .listaProyectos
  const contenedor = document.querySelector(".listaProyectos");
  if (!contenedor) return;

  const panelDetalles = document.querySelector(".proyectosDetalles");
  const lista = Array.isArray(proyectos) ? proyectos : [];

  // La API es la fuente de verdad: se vacía el HTML hardcodeado incluso
  // cuando no hay proyectos publicados.
  contenedor.textContent = "";

  if (!lista.length) {
    const vacio = document.createElement("p");
    vacio.className = "SeccionInformacion";
    vacio.textContent = "Todavía no hay proyectos publicados.";
    contenedor.appendChild(vacio);
    if (panelDetalles) panelDetalles.style.display = "none";
    limpiarDetalleProyecto();
    return;
  }

  if (panelDetalles) panelDetalles.style.display = "";

  let primerBoton = null;

  lista.forEach((proyecto, i) => {
    const item = document.createElement("div");
    item.className = "itemBoton";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "botonProyectos";
    btn.textContent = proyecto?.title || "Proyecto " + (i + 1);
    btn.dataset.imagen = proyecto?.image?.url || "img/placeholder-proyecto.svg";
    btn.dataset.repo = proyecto?.repoUrl || "";
    btn.setAttribute("aria-pressed", i === 0 ? "true" : "false");
    btn.addEventListener("click", () => mostrarProyecto(btn));

    if (i === 0) {
      btn.classList.add("active");
      primerBoton = btn;
    }

    const fecha = document.createElement("h6");
    fecha.className = "fechaBoton";
    const partesFecha = [];
    if (proyecto?.dateLabel) partesFecha.push(proyecto.dateLabel);
    if (proyecto?.role) partesFecha.push("Rol: " + proyecto.role);
    fecha.textContent = partesFecha.join(" · ");

    const desc = document.createElement("p");
    desc.className = "descripcionBoton";
    desc.textContent = proyecto?.description || "";

    const tagsUl = document.createElement("ul");
    tagsUl.className = "tagsProyecto";
    const tags = Array.isArray(proyecto?.tags) ? proyecto.tags : [];
    tags.forEach((tag) => {
      const li = document.createElement("li");
      li.textContent = String(tag);
      tagsUl.appendChild(li);
    });

    item.append(btn, fecha, desc);
    if (tagsUl.childElementCount) item.appendChild(tagsUl);
    contenedor.appendChild(item);
  });

  if (detalleEnlace) detalleEnlace.hidden = false;
  if (primerBoton) mostrarProyecto(primerBoton);
}

const ICONOS_TECNOLOGIA = {
  html: "html5.svg",
  html5: "html5.svg",
  css: "css3.svg",
  css3: "css3.svg",
  javascript: "javascript.svg",
  js: "javascript.svg",
  "c++": "cpp.svg",
  cpp: "cpp.svg"
};

function pintarTecnologias(grupos) {
  // Contenedor real en el HTML: .gruposTecnologias
  const contenedor = document.querySelector(".gruposTecnologias");
  if (!contenedor) return;

  const lista = Array.isArray(grupos) ? grupos : [];
  const gruposValidos = lista
    .map((grupo) => ({
      name: String(grupo?.name || "").trim(),
      skills: (Array.isArray(grupo?.skills) ? grupo.skills : [])
        .map((skill) => String(skill || "").trim())
        .filter(Boolean)
    }))
    .filter((grupo) => grupo.name && grupo.skills.length);

  contenedor.textContent = "";

  if (!gruposValidos.length) {
    const vacio = document.createElement("p");
    vacio.className = "SeccionInformacion";
    vacio.textContent = "Todavía no hay tecnologías publicadas.";
    contenedor.appendChild(vacio);
    return;
  }

  gruposValidos.forEach((grupo) => {
    const grupoDiv = document.createElement("div");
    grupoDiv.className = "grupoTecnologia";

    const h4 = document.createElement("h4");
    h4.textContent = grupo.name;
    grupoDiv.appendChild(h4);

    const ul = document.createElement("ul");
    ul.className = "listaTecnologias";

    grupo.skills.forEach((skill) => {
      const li = document.createElement("li");
      const archivo = ICONOS_TECNOLOGIA[skill.toLowerCase()];

      if (archivo) {
        const img = document.createElement("img");
        img.className = "iconoTecnologia";
        img.src = "img/" + archivo;
        img.alt = skill;
        img.width = 40;
        img.height = 40;
        img.loading = "lazy";
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

function pintarAbout(about) {
  const contenedor = document.getElementById("about-parrafos");
  const foto = document.getElementById("about-foto");

  if (contenedor) {
    const parrafos = (Array.isArray(about?.paragraphs) ? about.paragraphs : [])
      .map((texto) => String(texto || "").trim())
      .filter(Boolean);

    contenedor.textContent = "";
    parrafos.forEach((texto) => {
      const p = document.createElement("p");
      p.className = "SeccionInformacion";
      p.textContent = texto;
      contenedor.appendChild(p);
    });
    contenedor.hidden = parrafos.length === 0;
  }

  if (foto) {
    if (about?.photo?.alt) foto.alt = about.photo.alt;
    const url = String(about?.photo?.url || "").trim();
    const destino = url || "img/yomerengues.jpeg";
    foto.onerror = null;
    if (foto.getAttribute("src") !== destino) {
      foto.src = destino;
    }
    if (url) {
      foto.onerror = () => {
        foto.onerror = null;
        foto.src = "img/yomerengues.jpeg";
      };
    }
  }
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

  const enlaces = new Map();
  (Array.isArray(redes) ? redes : []).forEach((red) => {
    const platform = String(red?.platform || "").trim().toLowerCase();
    const url = String(red?.url || "").trim();
    if (platform && url) enlaces.set(platform, url);
  });

  const aplicarMapa = (mapa) => {
    Object.entries(mapa).forEach(([platform, selector]) => {
      const enlace = document.querySelector(selector);
      if (!enlace) return;
      const url = enlaces.get(platform);
      if (url) {
        enlace.href = url;
        enlace.style.display = "";
      } else {
        enlace.style.display = "none";
      }
    });
  };

  aplicarMapa(mapaContacto);
  aplicarMapa(mapaFijo);
}

// Inicializa el formulario de contacto. Se llama al arrancar la landing,
// sin esperar a que responda la API.
function initFormularioContacto() {
  const formContacto = document.querySelector("#form-contacto");
  if (!formContacto || formContacto.dataset.inicializado === "true") return;
  formContacto.dataset.inicializado = "true";

  const boton = formContacto.querySelector('button[type="submit"]');

  formContacto.addEventListener("submit", async (e) => {
    e.preventDefault(); // evita recarga / envío por GET

    const valor = (nombre) => {
      const campo = formContacto.elements.namedItem(nombre);
      return campo && "value" in campo ? campo.value.trim() : "";
    };

    const data = {
      name: valor("name"),
      email: valor("email"),
      message: valor("message"),
      website: valor("website")
    };

    if (!data.name || !data.email || !data.message) {
      alert("Completa tu nombre, email y mensaje.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      alert("Escribe un email válido.");
      return;
    }

    const textoOriginal = boton?.textContent || "Enviar mensaje";
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Enviando...";
    }

    try {
      const resp = await fetch(API_BASE + "/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      });

      let resultado = null;
      try {
        resultado = await resp.json();
      } catch (error) {
        resultado = null;
      }

      if (!resp.ok) {
        const detalle = resultado?.detail;
        let mensaje = "No se pudo enviar. Inténtalo de nuevo.";
        if (typeof detalle === "string") {
          mensaje = detalle;
        } else if (Array.isArray(detalle) && detalle[0]?.msg) {
          mensaje = detalle[0].msg;
        } else if (resp.status === 429) {
          mensaje = "Demasiados envíos. Inténtalo más tarde.";
        }
        alert("❌ " + mensaje);
        return;
      }

      if (resultado?.ok) {
        alert("✅ Mensaje enviado correctamente");
        formContacto.reset();
      } else {
        alert("❌ No se pudo enviar. Inténtalo de nuevo.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ No se pudo conectar con el servidor");
    } finally {
      if (boton) {
        boton.disabled = false;
        boton.textContent = textoOriginal;
      }
    }
  });
}

// Arranque: se declara al final para que todas las constantes y funciones
// estén inicializadas antes de pintar la primera respuesta.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciarLanding);
} else {
  iniciarLanding();
}