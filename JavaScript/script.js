// --- Scroll suave ---
const lenis = new Lenis();
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// --- Secciones en pantalla ---
// .active deja de significar "la seccion que elegiste en el menu" y pasa a
// significar "esta seccion esta en pantalla". Las reglas CSS que cuelgan de esa
// clase (los titulos fantasma PROYECTOS/INFO, la animacion de entrada) siguen
// igual sin tocar nada.
const secciones = [...document.querySelectorAll("main section")];
const proporcionEnPantalla = new Map();

const observador = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
        proporcionEnPantalla.set(e.target, e.intersectionRatio);
    }

    // Dos secciones se pisan un rato en el borde. Sin quedarse con la de mayor
    // proporcion, aparecerian los dos titulos fantasma a la vez.
    let mejor = null;
    let mejorProporcion = 0;
    for (const [el, proporcion] of proporcionEnPantalla) {
        if (proporcion > mejorProporcion) {
            mejorProporcion = proporcion;
            mejor = el;
        }
    }

    for (const s of secciones) {
        s.classList.toggle("active", s === mejor);
    }
}, { threshold: [0, 0.25, 0.5, 0.75, 1] });

for (const s of secciones) observador.observe(s);

// Los href siguen siendo anclas de verdad (cursor de enlace, abrir en pestana
// nueva), pero el desplazamiento lo lleva Lenis para que sea suave y no un
// salto. Lenis escribe el scrollTop real, no un transform, asi que three.js
// sigue leyendo window.scrollY sin necesidad de acoplarse a el.
document.querySelectorAll('a[href^="#"]').forEach((enlace) => {
    enlace.addEventListener("click", (evento) => {
        const destino = enlace.getAttribute("href");
        if (!destino || destino === "#") return;

        evento.preventDefault();

        if (destino === "#inicio") {
            lenis.scrollTo(0, { duration: 1.4 });
            return;
        }

        const seccion = document.querySelector(destino);
        if (seccion) lenis.scrollTo(seccion, { duration: 1.4 });
    });
});

document.querySelectorAll(".botonProyectos").forEach(function (boton) {
    boton.addEventListener("click", function () {
        document.querySelectorAll(".botonProyectos").forEach(b => b.classList.remove("active"));
        boton.classList.add("active");
        const titulo = document.getElementById("detalle-titulo");
        const descripcion = document.getElementById("detalle-descripcion");
        if (titulo) titulo.textContent = boton.dataset.titulo || "";
        if (descripcion) descripcion.textContent = boton.dataset.descripcion || "";
    });
});

// --- Retícula viva ---
// Las columnas no se fijan aqui: se leen del estilo computado del contenedor,
// que es donde querysMovil.css decide cuantas hay (30 / 16 / 10 / 8 segun el
// ancho). Por eso hay que repintar en cada resize.
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
