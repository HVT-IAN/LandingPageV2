const menuPrincipal = document.querySelector(".menuPrincipal");
const links = document.querySelectorAll("nav a");

// --- Inicialización de Lenis ---
const lenis = new Lenis();
function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// --- Inicialización de Particles.js ---
particlesJS("particles-js", {
    "particles": {
        "number": { "value": 190, "density": { "enable": true, "value_area": 900 } },
        "color": { "value": "#ffffff" },
        "shape": { "type": "polygon", "polygon": { "nb_sides": { "value": 5, "random": true, "minimum": 3 } } },
        "opacity": { "value": 0.3, "random": true },
        "size": { "value": 2, "random": true },
        "line_linked": { "enable": true, "distance": 50, "opacity": 0.2 },
        "move": { "enable": true, "speed": 0.4, "direction": "bottom-right", "random": true }
    },
    "interactivity": { "events": { "onhover": { "enable": true, "mode": "push", "resize": true, "modes": { "push": { "distance": 400, "duration": 0.4 } } } } },
    "retina_detect": true
});

function cambiarEscenario(hash) {
    moverCamara(hash);
    // Ya no hacemos nada aquí, ya que quitamos los efectos
}

function mostrarSeccion(hash) {
    // ... lógica originalsssss
    if (hash === "#inicio" || hash === "") {
        menuPrincipal.classList.add("active");
        const seccionActiva = document.querySelector("section.active");
        if (seccionActiva) {
            seccionActiva.classList.remove("active");
        }
        links.forEach(l => l.classList.remove("active"));
        cambiarEscenario("#inicio"); // Añadimos esto
        return;
    }

    const seccion = document.querySelector(hash);
    if (!seccion) return;

    const seccionActiva = document.querySelector("section.active");
    if (seccionActiva) {
        seccionActiva.classList.remove("active");
    }
    seccion.classList.add("active");
    menuPrincipal.classList.remove("active");

    links.forEach(l => l.classList.remove("active"));
    const linkCorrespondiente = document.querySelector(`nav a[href="${hash}"]`);
    if (linkCorrespondiente) {
        linkCorrespondiente.classList.add("active");
    }

    cambiarEscenario(hash); // Añadimos esto
}

window.addEventListener("hashchange", function () {
    mostrarSeccion(window.location.hash);
});

window.addEventListener("DOMContentLoaded", function () {
    mostrarSeccion(window.location.hash);
});
document.querySelectorAll(".botonProyectos").forEach(function (boton) {
    boton.addEventListener("click", function () {
        document.querySelectorAll(".botonProyectos").forEach(b => b.classList.remove("active"));
        boton.classList.add("active");

        document.getElementById("detalle-titulo").textContent = boton.dataset.titulo;
        document.getElementById("detalle-fecha").textContent = boton.dataset.fecha;
        document.getElementById("detalle-descripcion").textContent = boton.dataset.descripcion;
    });
});

const contenedor = document.querySelector(".gridOndas");
const filas = 15;
const columnas = 30;
const puntos = [];

for (let fila = 0; fila < filas; fila++) {
    for (let columna = 0; columna < columnas; columna++) {
        const punto = document.createElement("span");
        contenedor.appendChild(punto);
        puntos.push(punto);
    }
}

// Guardamos la posición real de cada punto UNA sola vez
function guardarPosiciones() {
    puntos.forEach(function (p) {
        const rect = p.getBoundingClientRect();
        p.datosX = rect.left + rect.width / 2;
        p.datosY = rect.top + rect.height / 2;
    });
}
window.addEventListener("load", guardarPosiciones);
window.addEventListener("resize", guardarPosiciones);

// Seguimos la posición del mouse
let mouseX = -9999;
let mouseY = -9999;
document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// El bucle de animación: se ejecuta ~60 veces por segundo
function animar() {
    puntos.forEach(function (p) {
        const dx = mouseX - p.datosX;
        const dy = mouseY - p.datosY;
        const distancia = Math.sqrt(dx * dx + dy * dy);
        const radioReaccion = 400;

        if (distancia < radioReaccion) {
            const intensidad = 1 - (distancia / radioReaccion);
            p.style.opacity = 0.15 + intensidad * 0.85;
            p.style.transform = "scale(" + (1 + intensidad * 3) + ")";
        } else {
            p.style.opacity = "";
            p.style.transform = "";
        }
    });
    requestAnimationFrame(animar);
}
requestAnimationFrame(animar);


