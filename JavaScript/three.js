const canvas = document.getElementById("escena3d");
const escena = new THREE.Scene();

const near = 0.1;
const far = 1000;

const camara = new THREE.PerspectiveCamera(
    90,
    window.innerWidth / window.innerHeight,
    near,
    far
);

const fovEscritorio = 90;
const fovTecho = 108;

function ajustarEncuadre() {
    const aspect = window.innerWidth / window.innerHeight;

    const fov = aspect >= 1
        ? fovEscritorio
        : Math.min(
            fovTecho,
            Math.max(
                fovEscritorio,
                2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(50)) / aspect)
                * THREE.MathUtils.RAD2DEG
            )
        );

    camara.aspect = aspect;
    camara.fov = fov;
    camara.updateProjectionMatrix();
}

ajustarEncuadre();

const cameraRig = new THREE.Group();
cameraRig.add(camara);
escena.add(cameraRig);

camara.position.set(0, 1.7, 0.8);
cameraRig.position.set(0, 0, 0);

let renderizado = null;
try {
    renderizado = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    if (!renderizado.getContext()) renderizado = null;
} catch (e) {
    renderizado = null;
}

if (renderizado) {
    renderizado.setSize(window.innerWidth, window.innerHeight);
    renderizado.setPixelRatio(window.devicePixelRatio);
} else {
    console.warn("WebGL no disponible: el fondo 3D queda desactivado. El puntille sigue visible.");
}

const queryMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducirMovimiento = queryMovimiento.matches;
queryMovimiento.addEventListener("change", (e) => {
    reducirMovimiento = e.matches;
});

const ambientLight = new THREE.AmbientLight(0xbfbfbf, 0.9);
escena.add(ambientLight);

const windowLight = new THREE.DirectionalLight(0xffffff, 0.5);
windowLight.position.set(0, 2, -5);
windowLight.target.position.set(0, 1.3, -40);
escena.add(windowLight);
escena.add(windowLight.target);

const outsideGroup = new THREE.Group();
outsideGroup.position.set(0, 1.0, -130);
escena.add(outsideGroup);

const starCount = 5000;
const starGeo = new THREE.BufferGeometry();

const posBase = new Float32Array(starCount * 3);
const posProyectos = new Float32Array(starCount * 3);
const posInformacion = new Float32Array(starCount * 3);

const capas = [
    { r: 45, n: 1800 },
    { r: 80, n: 2200 },
    { r: 115, n: 1400 }
];

let idxBase = 0;
const rMaxCapa = 115;
for (const capa of capas) {
    for (let i = 0; i < capa.n && idxBase < starCount; i++) {
        const i3 = idxBase * 3;
        const r = capa.r + (Math.random() - 0.5) * 10;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        posBase[i3] = r * Math.sin(phi) * Math.cos(theta);
        posBase[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        posBase[i3 + 2] = r * Math.cos(phi);
        idxBase++;
    }
}

const coloresBase = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const d = Math.hypot(posBase[i3], posBase[i3 + 1], posBase[i3 + 2]);
    const v = Math.pow(Math.min(1, d / rMaxCapa), 0.9) * 0.75;
    coloresBase[i3] = v;
    coloresBase[i3 + 1] = v;
    coloresBase[i3 + 2] = v;
}

// Segmentos [x0,y0,z0, x1,y1,z1] que dibujan cada figura (3D)
function construirSegmentos(tipo) {
    const segs = [];

    if (tipo === "proyectos") {
        // Piramide triangular (tetraedro): base horizontal + apex, 6 aristas.
        // Centrada en el pivote -> gira sobre su eje Y sin derivar.
        const R = 35;
        const apexY = R * 0.55;
        const baseY = -R * 0.45;
        const baseR = R * 0.8;

        const base = [];
        for (let k = 0; k < 3; k++) {
            const ang = Math.PI / 2 + k * (2 * Math.PI / 3);
            base.push([baseR * Math.cos(ang), baseY, baseR * Math.sin(ang)]);
        }
        const apex = [0, apexY, 0];

        // aristas de la base
        for (let k = 0; k < 3; k++) {
            const a = base[k];
            const b = base[(k + 1) % 3];
            segs.push([a[0], a[1], a[2], b[0], b[1], b[2]]);
        }
        // aristas del apex a cada vertice de la base
        for (let k = 0; k < 3; k++) {
            const b = base[k];
            segs.push([apex[0], apex[1], apex[2], b[0], b[1], b[2]]);
        }
    } else {
        const largo = 150;
        const radio = 26;
        const vueltas = 2.2;
        const pasos = 100;
        const cadaTrav = 6;     // un travesano cada N pasos

        const punto = (t, fase) => {
            const ang = t * vueltas * Math.PI * 2 + fase;
            return [
                Math.cos(ang) * radio,
                (t - 0.5) * largo,
                Math.sin(ang) * radio
            ];
        };

        for (let s = 0; s < pasos; s++) {
            const t0 = s / pasos;
            const t1 = (s + 1) / pasos;

            // hebra 1 (fase 0) y hebra 2 (fase PI): van desfasadas media vuelta
            const a0 = punto(t0, 0);
            const a1 = punto(t1, 0);
            const b0 = punto(t0, Math.PI);
            const b1 = punto(t1, Math.PI);

            segs.push([a0[0], a0[1], a0[2], a1[0], a1[1], a1[2]]);
            segs.push([b0[0], b0[1], b0[2], b1[0], b1[1], b1[2]]);

            // travesanos: unen las dos hebras a la misma altura
            if (s % cadaTrav === 0) {
                segs.push([a0[0], a0[1], a0[2], b0[0], b0[1], b0[2]]);
            }
        }
    }

    return segs;
}

function repartirSobreSegmentos(destino, segs) {
    const porSegmento = Math.max(1, Math.floor(starCount / segs.length));
    let idx = 0;

    for (const s of segs) {
        for (let p = 0; p < porSegmento && idx < starCount; p++) {
            const t = Math.random();
            const i3 = idx * 3;
            destino[i3] = s[0] + (s[3] - s[0]) * t + (Math.random() - 0.5) * 0.4;
            destino[i3 + 1] = s[1] + (s[4] - s[1]) * t + (Math.random() - 0.5) * 0.4;
            destino[i3 + 2] = s[2] + (s[5] - s[2]) * t + (Math.random() - 0.5) * 0.4;
            idx++;
        }
    }

    while (idx < starCount) {
        const i3 = idx * 3;
        destino[i3] = (Math.random() - 0.5) * 150;
        destino[i3 + 1] = (Math.random() - 0.5) * 110;
        destino[i3 + 2] = (Math.random() - 0.5) * 90;
        idx++;
    }
}

repartirSobreSegmentos(posProyectos, construirSegmentos("proyectos"));
repartirSobreSegmentos(posInformacion, construirSegmentos("informacion"));

function coloresPorAltura(pos, minV, maxV) {
    const cols = new Float32Array(starCount * 3);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < starCount; i++) {
        const y = pos[i * 3 + 1];
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    const rango = (maxY - minY) || 1;
    for (let i = 0; i < starCount; i++) {
        const v = minV + ((pos[i * 3 + 1] - minY) / rango) * (maxV - minV);
        cols[i * 3] = v;
        cols[i * 3 + 1] = v;
        cols[i * 3 + 2] = v;
    }
    return cols;
}

const coloresProyectos = coloresPorAltura(posProyectos, 0.30, 0.92);
const coloresInformacion = coloresPorAltura(posInformacion, 0.30, 0.92);

// Array propio de la geometria: BufferAttribute no copia el array
starGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(posBase), 3));
starGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(coloresBase), 3));

const starMat = new THREE.PointsMaterial({
    color: 0x000000,
    size: 0.5,
    sizeAttenuation: true,
    vertexColors: true
});

const stars = new THREE.Points(starGeo, starMat);
outsideGroup.add(stars);
const poliGroup = new THREE.Group();
escena.add(poliGroup);

// Amplificacion lateral del campo de poligonos. 1 = tal cual esta en poliDefs,
// que es el valor por defecto y no cambia nada.
//
// En pantallas verticales el campo es mas ancho que el marco incluso en la pose
// de inicio: mide ~106 unidades de extent lateral (contando el radio en la
// peor orientacion de giro) y en 375px el medio ancho llega a 83 al arrancar y
// baja a 57 en la pose final, asi que las losas de los extremos se recortan por
// los bordes. Se deja a proposito: las losas ya giran solas y entraban y salian
// del marco de todos modos, y un campo que se sale del marco se lee como mas
// espacio que un diorama contenido. Bajar esto a ~0.7 las mete sin tocar el
// dolly, por si en un movil se ve que recorta de mas.
const ampliacionLateral = 1;

const poliDefs = [
    { lados: 3, radio: 15, x: -64, y: -10, z: -66, vel: 0.0022 },
    { lados: 4, radio: 12, x: 68, y: 18, z: -98, vel: 0.0015 },
    { lados: 5, radio: 19, x: -38, y: 32, z: -155, vel: 0.0011 },
    { lados: 6, radio: 14, x: 52, y: -24, z: -190, vel: 0.0009 },
    { lados: 3, radio: 10, x: 18, y: 36, z: -225, vel: 0.0007 },
    { lados: 4, radio: 21, x: -76, y: 24, z: -118, vel: 0.0013 },
    { lados: 5, radio: 11, x: 40, y: -36, z: -60, vel: 0.0019 },
    { lados: 8, radio: 17, x: -20, y: -32, z: -248, vel: 0.0006 }
];

const poliNear = -60;
const poliFar = -250;
const poliVivos = [];

const paletaPoligonos = [
    0xc4c4c4, // gris claro
    0xd6d6d6, // gris palido
    0xb8b8b8, // gris medio
    0xcccccc, // gris medio claro
    0xdedede, // gris muy claro
    0xc0c0c0, // gris medio suave
    0xd0d0d0, // gris palido medio
    0xb4b4b4  // gris medio, el mas oscuro de la lista
];

for (let n = 0; n < poliDefs.length; n++) {
    const d = poliDefs[n];
    const shape = new THREE.Shape();
    for (let i = 0; i < d.lados; i++) {
        const ang = (i / d.lados) * Math.PI * 2;
        const x = Math.cos(ang) * d.radio;
        const y = Math.sin(ang) * d.radio;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
    }
    shape.closePath();


    const grosor = d.radio * 0.16;
    const geo = new THREE.ExtrudeGeometry(shape, {
        depth: grosor,
        bevelEnabled: false
    });
    geo.translate(0, 0, -grosor / 2);

    const t = Math.min(1, Math.max(0, (poliNear - d.z) / (poliNear - poliFar)));
    const mat = new THREE.MeshBasicMaterial({
        color: paletaPoligonos[n % paletaPoligonos.length],
        transparent: true,
        opacity: 0.88 - t * 0.20,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    const losa = new THREE.Mesh(geo, mat);
    losa.position.set(d.x * ampliacionLateral, d.y, d.z);

    // Orientacion inicial distinta: si no, todos se ven de frente y planos
    poliVivos.push({
        obj: losa,
        vel: d.vel,
        ang: 0,
        rotX0: Math.random() * Math.PI,
        rotY0: Math.random() * Math.PI,
        y0: d.y,
        fase: Math.random() * Math.PI * 2,
        amp: 3 + Math.random() * 5
    });
    poliGroup.add(losa);
}

// --- Morphing por scroll ---
// Los tres estados dejan de ser destinos a los que se salta y pasan a ser
// keyframes colocados en el centro de cada seccion. El scroll llega ya
// suavizado: Lenis escribe el scrollTop de verdad (no un transform), asi que
// window.scrollY es el valor interpolado y no hay que consultarle nada.
const morphEstados = {
    "#inicio": { pos: posBase, col: coloresBase },
    "#panel-proyectos": { pos: posProyectos, col: coloresProyectos },
    "#panel-informacion": { pos: posInformacion, col: coloresInformacion }
};

const cameraWaypoints = {
    "#inicio": {
        position: new THREE.Vector3(0, 1.7, 0.6),
        target: new THREE.Vector3(0, 1.2, -50)
    },
    "#panel-proyectos": {
        position: new THREE.Vector3(-6, 2, -20),
        target: new THREE.Vector3(-2, 1.55, -50)
    },
    "#panel-informacion": {
        position: new THREE.Vector3(1, -1, -40),
        target: new THREE.Vector3(1.5, 1.15, -50)
    }
};

// Velocidad de giro por estado. Antes salia de un if/else sobre la seccion
// activa; ahora se interpola con el mismo progreso que la mezcla.
const girosPorEstado = {
    "#inicio": 0.0003,
    "#panel-proyectos": 0.0025,
    "#panel-informacion": 0.0018
};

const atrPos = starGeo.getAttribute("position");
const atrCol = starGeo.getAttribute("color");
const total = starCount * 3;
const cameraTarget = new THREE.Vector3(0, 1.3, -50);

// Fraccion de cada tramo reservada en cada extremo para la figura ya completa.
// El morph se comprime en el (1 - 2 * meseta) central.
//
// Esto es lo que hace que las secciones se distinguen. Sin meseta, el smoothstep
// reparte la mezcla por todo el tramo, y como los tramos miden casi dos
// pantallas el primero y una el segundo, se pasaba mas de 900px con la figura a
// medio formar: media esfera, medio tetraedro, ninguna de las dos. Con la
// meseta la figura se queda quieta y terminada mientras se lee su seccion, y el
// cambio ocurre en un tramo corto y reconocible.
//
// De paso sale gratis en GPU: durante la meseta t vale 0 exacto, asi que el
// indice + t no se mueve y escribirMorph no llega a llamarse.
const meseta = 0.30;

// Cuanto se apagan las estrellas en el centro del cruce. 0 = sin fundido,
// 1 = desaparecen del todo. Se aplica al atributo de color, no a
// material.opacity, porque transparent:true moveria los puntos al pase de
// dibujado transparente y cambiaria su orden respecto a las losas de
// poligonos.
const profundidadFundido = 0.75;

// indice del ultimo keyframe escrito + su t. -1 fuerza la primera escritura.
let progresoGlobal = -1;
// Par de keyframes y mezcla del frame en curso, para el giro y la camara.
let mezclaActual = null;
// Cada keyframe con la coordenada de scroll a la que corresponde.
let keyframes = [];

function medirKeyframes() {
    // Techo real del scroll. El centro de la ultima seccion cae por fuera: con
    // dos secciones de 100vh el alto total no da para dejarla centrada, asi que
    // sin este tope su keyframe queda ahi arriba y la figura de informacion
    // nunca llega a completarse.
    const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight
    );

    keyframes = Object.keys(morphEstados).map((hash) => {
        const el = document.querySelector(hash);
        // "#inicio" no tiene elemento: es el tope de la pagina.
        let y = 0;
        if (el) {
            const r = el.getBoundingClientRect();
            y = Math.min(maxScroll, r.top + window.scrollY + r.height / 2);
        }
        return {
            hash,
            y,
            estado: morphEstados[hash],
            pose: cameraWaypoints[hash],
            giro: girosPorEstado[hash]
        };
    });
    keyframes.sort((a, b) => a.y - b.y);
    progresoGlobal = -1;
}

// Devuelve los dos keyframes entre los que cae el scroll y la mezcla t.
function mezclar(y) {
    const primero = keyframes[0];
    if (y <= primero.y) return { i: 0, a: primero, b: primero, t: 0 };

    const ultimo = keyframes[keyframes.length - 1];
    if (y >= ultimo.y) return { i: keyframes.length - 1, a: ultimo, b: ultimo, t: 0 };

    for (let i = 0; i < keyframes.length - 1; i++) {
        const a = keyframes[i];
        const b = keyframes[i + 1];
        if (y >= a.y && y <= b.y) {
            // span 0 pasa cuando dos keyframes caen en el mismo scroll, que
            // ocurre si la pagina se queda corta: se toma el estado destino.
            const span = b.y - a.y;
            if (span <= 0) return { i, a, b, t: 1 };

            const pos = (y - a.y) / span;
            if (pos <= meseta) return { i, a, b, t: 0 };
            if (pos >= 1 - meseta) return { i, a, b, t: 1 };

            // Se recorta la meseta de los dos extremos y el smoothstep se
            // aplica sobre lo que queda en el medio.
            const u = (pos - meseta) / (1 - 2 * meseta);
            return { i, a, b, t: u * u * (3 - 2 * u) };
        }
    }

    return { i: keyframes.length - 1, a: ultimo, b: ultimo, t: 0 };
}

function escribirMorph(a, b, t) {
    const pa = atrPos.array;
    const ca = atrCol.array;
    const ap = a.estado.pos;
    const ac = a.estado.col;
    const bp = b.estado.pos;
    const bc = b.estado.col;

    // En el centro del cruce las estrellas se van a blanco sobre el fondo
    // blanco, o sea desaparecen, y el paso se lee como un disolverse y
    // reconstituirse en vez de una deformacion amorfa. En t=0 y t=1 vale 1
    // justo, asi que las figuras terminadas no se tocan y la rama de movimiento
    // reducido (que escribe con t=0) tampoco se ve afectada.
    const atenuacion = 1 - profundidadFundido * Math.sin(Math.PI * t);

    for (let i = 0; i < total; i++) {
        pa[i] = ap[i] + (bp[i] - ap[i]) * t;
        ca[i] = (ac[i] + (bc[i] - ac[i]) * t) * atenuacion;
    }

    atrPos.needsUpdate = true;
    atrCol.needsUpdate = true;
}

function escribirCamara(a, b, t) {
    const pa = a.pose.position;
    const ta = a.pose.target;
    const pb = b.pose.position;
    const tb = b.pose.target;

    cameraRig.position.set(
        pa.x + (pb.x - pa.x) * t,
        pa.y + (pb.y - pa.y) * t,
        pa.z + (pb.z - pa.z) * t
    );
    cameraTarget.set(
        ta.x + (tb.x - ta.x) * t,
        ta.y + (tb.y - ta.y) * t,
        ta.z + (tb.z - ta.z) * t
    );
}

function aplicarScroll() {
    const mezcla = mezclar(window.scrollY);
    mezclaActual = mezcla;

    // Sin movimiento no hay interpolacion: se escribe el keyframe mas cercano
    // tal cual. La camara se queda quieta en la pose de inicio, sin dolly.
    if (reducirMovimiento) {
        const elegirB = mezcla.t >= 0.5;
        const g = mezcla.i + (elegirB ? 1 : 0);
        if (g !== progresoGlobal) {
            const kf = elegirB ? mezcla.b : mezcla.a;
            escribirMorph(kf, kf, 0);
            progresoGlobal = g;
        }
        return;
    }

    // indice + t es un unico escalar monotono a lo largo de todo el recorrido.
    // Comparar solo t daria un falso negativo al cambiar de par de keyframes
    // manteniendo el mismo t, que es justo lo que pasa en el centro de cada
    // seccion.
    const g = mezcla.i + mezcla.t;
    if (Math.abs(g - progresoGlobal) > 0.0004) {
        escribirMorph(mezcla.a, mezcla.b, mezcla.t);
        progresoGlobal = g;
    }

    // La camara se interpola siempre, sin guarda: si el morph se funde y la
    // camara saltara entre poses, el conjunto se rompe.
    escribirCamara(mezcla.a, mezcla.b, mezcla.t);
}

let velocidadGiro = 0.0003;

function animacion() {
    requestAnimationFrame(animacion);

    aplicarScroll();

    if (!reducirMovimiento) {
        const giroObjetivo = mezclaActual.a.giro
            + (mezclaActual.b.giro - mezclaActual.a.giro) * mezclaActual.t;

        velocidadGiro += (giroObjetivo - velocidadGiro) * 0.05;
        outsideGroup.rotation.y += velocidadGiro;

        for (const p of poliVivos) {
            p.ang += p.vel;
            p.obj.rotation.y = p.rotY0 + p.ang;
            p.obj.rotation.x = p.rotX0 + p.ang * 0.55;
            p.obj.position.y = p.y0 + Math.sin(p.ang * 2.2 + p.fase) * p.amp;
        }
    }

    camara.lookAt(cameraTarget);

    renderizado.render(escena, camara);
}

medirKeyframes();
// Las fuentes y las imagenas tardan en cargar y cambian la altura de las
// secciones, asi que los keyframes se vuelven a medir cuando ya esta todo.
window.addEventListener("load", medirKeyframes);

if (renderizado) animacion();

window.addEventListener("resize", () => {
    ajustarEncuadre();
    if (renderizado) {
        renderizado.setSize(window.innerWidth, window.innerHeight);
    }
    medirKeyframes();
});