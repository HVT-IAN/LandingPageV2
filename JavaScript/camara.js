const escena = document.getElementById("escena");
const camara = document.getElementById("camara");
const planos = document.querySelectorAll(".fondoSeccion");

// Posición de cada fondo en el espacio. Cambia estos números para otro recorrido:
// z más negativo = más lejos (la cámara avanza más al ir hacia allá)
const lugares = {
    "fondo-inicio": { x: 0, y: 0, z: 0, ry: 0 },
    "fondo-proyectos": { x: 2600, y: -500, z: -1400, ry: -18 },
    "fondo-informacion": { x: -2600, y: 600, z: -1800, ry: 18 }
};

const idPorHash = {
    "#panel-proyectos": "fondo-proyectos",
    "#panel-informacion": "fondo-informacion"
};

// Coloca cada plano en su lugar
planos.forEach(function (p) {
    const l = lugares[p.id];
    p.style.transform = `translate3d(${l.x}px, ${l.y}px, ${l.z}px) rotateY(${l.ry}deg)`;
});

// Formas decorativas repartidas en profundidad
const colores = ["rgba(0,0,106,.35)", "rgba(70,20,140,.3)", "rgba(157,1,1,.25)"];
for (let i = 0; i < 40; i++) {
    const f = document.createElement("div");
    const t = 80 + Math.random() * 260;
    f.className = "forma";
    f.style.width = f.style.height = t + "px";
    f.style.background = colores[i % 3];
    f.style.transform = `translate3d(${Math.random() * 7000 - 3500}px, ${Math.random() * 3000 - 1500}px, ${-Math.random() * 2600}px) rotate(${Math.random() * 360}deg)`;
    camara.prepend(f);
}

// La cámara se mueve al INVERSO de la posición del plano destino
function moverCamara(hash) {
    const id = idPorHash[hash] || "fondo-inicio";
    const l = lugares[id];
    camara.style.transform = `rotateY(${-l.ry}deg) translate3d(${-l.x}px, ${-l.y}px, ${-l.z}px)`;
    planos.forEach(p => p.classList.toggle("activo", p.id === id));
}

// Leve parallax con el mouse (mueve el punto de vista de la lente)
document.addEventListener("mousemove", function (e) {
    const mx = e.clientX / innerWidth;
    const my = e.clientY / innerHeight;
    escena.style.perspectiveOrigin = `${40 + mx * 20}% ${40 + my * 20}%`;
});

// ---- BARRIDO ----
const bandas = document.querySelectorAll("#barrido span");
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
let barrido;

// Cubre la pantalla, cambia la sección cuando está tapada y destapa.
// La cámara arranca al inicio, así el viaje 3D ocurre "debajo" de las bandas.
function irConBarrido(hash) {
    if (!window.gsap || sinMovimiento) {
        mostrarSeccion(hash);
        return;
    }
    if (barrido) barrido.kill();
    moverCamara(hash);

    barrido = gsap.timeline();
    barrido
        .set(bandas, { xPercent: -120, skewX: -20 })
        .to(bandas, { xPercent: 0, duration: 0.45, ease: "power3.in", stagger: 0.08 })
        .add(function () { mostrarSeccion(hash); })
        .to(bandas, { xPercent: 120, duration: 0.45, ease: "power3.out", stagger: 0.08 });
}