"""Carga el contenido inicial. Ejecuta:  python -m app.seed
Edita los textos para que coincidan con tu HTML actual. Es seguro repetirlo: reemplaza el contenido."""
from sqlalchemy import delete

from .main import init_db
from .database import SessionLocal
from .models import About, Project, SiteSettings, Skill, SkillGroup, SocialLink

SETTINGS = dict(
    seo_title="Ian Oscani | Frontend Developer",
    meta_description="Portafolio de Ian Oscani: desarrollo frontend y experiencias web 3D.",
    availability="Disponible para proyectos",
    hero_title="Ian Oscani",
    hero_subtitle="Frontend Developer",
    hero_hook="Interfaces con movimiento y profundidad.",
    cta_primary="Ver proyectos",
    cta_secondary="Contacto",
    contact_title="Hablemos",
    contact_text="¿Tienes una idea o proyecto? Escríbeme.",
    contact_email="tu-correo@ejemplo.com",  # CAMBIAR por tu correo real
)

ABOUT = dict(paragraphs=["Soy Ian, desarrollador frontend.", "Me gusta el 3D y el motion en la web."],
             photo_url="", photo_alt="Ian Oscani")

# Reemplaza estos 3 proyectos por los reales de tu HTML
PROJECTS = [
    dict(slug="deco-one", title="DECO-ONE", date_label="Agosto 2026", role="Frontend",
         description="Descripción del proyecto.", tags=["HTML", "CSS", "JavaScript", "Responsive"],
         repo_url="", featured=True),
    dict(slug="proyecto-2", title="Proyecto 2", date_label="", role="Frontend",
         description="Descripción.", tags=["React"]),
    dict(slug="proyecto-3", title="Proyecto 3", date_label="", role="Frontend",
         description="Descripción.", tags=["Three.js"]),
]

SKILLS = {"Frontend": ["HTML", "CSS", "JavaScript", "React"],
          "3D/Motion": ["Three.js", "GSAP"],
          "Otros": ["Git", "Figma"]}

LINKS = [("github", "https://github.com/"), ("instagram", "https://instagram.com/"),
         ("linkedin", "https://linkedin.com/"), ("email", "mailto:tu-correo@ejemplo.com")]


def run():
    init_db()
    with SessionLocal() as db:
        for k, v in SETTINGS.items():
            setattr(db.get(SiteSettings, 1), k, v)
        for k, v in ABOUT.items():
            setattr(db.get(About, 1), k, v)
        for model in (Project, Skill, SkillGroup, SocialLink):
            db.execute(delete(model))
        for i, p in enumerate(PROJECTS, start=1):
            db.add(Project(position=i, **p))
        for gi, (name, items) in enumerate(SKILLS.items()):
            g = SkillGroup(name=name, position=gi)
            g.skills = [Skill(name=n, position=si) for si, n in enumerate(items)]
            db.add(g)
        for i, (plat, url) in enumerate(LINKS):
            db.add(SocialLink(platform=plat, url=url, position=i))
        db.commit()
    print("Contenido inicial cargado.")


if __name__ == "__main__":
    run()
