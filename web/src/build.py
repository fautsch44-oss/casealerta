#!/usr/bin/env python3
"""Genera casealerta.com estático (ES/EN): home, 50 páginas de estatus, legales, sitemap, robots, llms.txt."""
import json, re, os, shutil, unicodedata, html, datetime

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "..", "public")
SITE = "https://casealerta.com"
FN_URL = "https://uloquxlrghnvbrinfacw.supabase.co/functions/v1/casealerta-uscis-status"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsb3F1eGxyZ2hudmJyaW5mYWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5OTYzODYsImV4cCI6MjEwNjU3MjM4Nn0.bFu3nGfCDyGjhvfsTcjJnHYgNoq3h8D8Spo5C7DdvMs"
TODAY = datetime.date.today().isoformat()
INDEXNOW_KEY = "c4a5e1a7f0b84d2c9e3a6b1d8f2e7c41"
E = html.escape

def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

rows = json.load(open(os.path.join(BASE, "catalog.json"), encoding="utf-8"))
CAT = []
for code, tes, men, mes, sen, ses, kind in rows:
    CAT.append(dict(code=code, title_es=tes, men=men, mes=mes, sen=sen, ses=ses, kind=kind,
                    slug_en=slugify(code), slug_es=slugify(tes)))

T = {
 "es": dict(lang="es", tag="ALERTAS DE TU CASO USCIS Y CORTE", other="en", other_label="EN",
            home="/", status_base="/estatus/", privacy="/privacidad/", terms="/terminos/",
            nav_status="Estatus explicados", cta="Avísame cuando cambie", news="/noticias/", nav_news="Noticias y guías"),
 "en": dict(lang="en", tag="USCIS & COURT CASE ALERTS", other="es", other_label="ES",
            home="/en/", status_base="/status/", privacy="/privacy/", terms="/terms/",
            nav_status="Status explained", cta="Alert me when it changes", news="/en/news/", nav_news="News & guides"),
}

ICON = {
 "search": '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
 "bell": '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
 "spark": '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
 "shield": '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>',
 "globe": '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
 "ok": '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 "act": '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/></svg>',
 "good": '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
}
KIND = {"ok": ("#9A6400", "#FFF4DB"), "act": ("#C8102E", "#FCE8EB"), "good": ("#1E7A46", "#E3F5EA")}
KIND_LABEL = {"es": {"ok": "Sigue en proceso", "act": "Requiere tu atención", "good": "Buenas noticias"},
              "en": {"ok": "Still in process", "act": "Needs your attention", "good": "Good news"}}

CSS = """
:root{--blue:#1F4FA0;--navy:#0F2A5C;--gold:#D4A84B;--red:#C8102E;--bg:#F3F6FB;--muted:#5B6478;--line:#E3E8F0}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font-family:'Public Sans',system-ui,-apple-system,Segoe UI,sans-serif;color:var(--navy);background:var(--bg);line-height:1.5}
a{color:var(--blue)}a:hover{color:var(--red)}
.hdr{background:#fff;box-shadow:0 1px 0 var(--line)}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.hdr .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding-top:10px;padding-bottom:10px}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:inherit}
.medal{width:56px;height:56px;min-width:56px;border-radius:50%;background:#fff;border:3px solid var(--gold);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(15,42,92,.2)}
.medal img{width:48px;height:48px}
.lock{display:flex;flex-direction:column;gap:4px}
.word{font-family:'Cinzel',serif;font-weight:700;font-size:20px;letter-spacing:1.5px;margin-right:-1.5px;line-height:1;color:var(--blue)}
.rib{height:6px;border-radius:1px;background:linear-gradient(180deg,var(--red) 0 2px,#fff 2px 4px,var(--blue) 4px 6px)}
.tag{display:flex;justify-content:space-between;font-size:7.5px;font-weight:700;line-height:1;color:var(--muted)}
.nav{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.nav a{display:inline-flex;align-items:center;gap:6px;height:42px;padding:0 14px;border-radius:21px;font-weight:700;font-size:14px;text-decoration:none;color:var(--navy)}
.nav a.cta{background:var(--red);color:#fff}
.hero{background:var(--blue);color:#fff;padding:40px 0 80px}
.hero h1{margin:0 0 12px;font-size:clamp(28px,5vw,42px);line-height:1.15;font-weight:800}
.hero p.lead{margin:0;font-size:18px;color:#E3EAF7;max-width:620px}
.grid2{display:flex;flex-wrap:wrap;gap:28px;align-items:center}
.grid2>.main{flex:999 1 480px;min-width:0}.grid2>.side{flex:1 1 320px}
.card{background:#fff;color:var(--navy);border-radius:24px;padding:22px;box-shadow:0 4px 16px rgba(15,42,92,.08)}
.lookup label{display:block;font-size:13px;font-weight:600;color:var(--muted);margin:8px 0 6px}
.lookup input{width:100%;height:52px;border-radius:14px;border:2px solid #D6E0F2;padding:0 14px;font:inherit;font-size:17px;letter-spacing:1px;text-transform:uppercase}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:52px;padding:0 20px;border-radius:14px;border:0;background:var(--blue);color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;text-decoration:none}
.btn.red{background:var(--red)}.btn.full{width:100%;margin-top:10px}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
.chip{font-size:11px;font-weight:700;color:#1E7A46;background:#E3F5EA;border-radius:10px;padding:4px 8px}
.main-pull{margin-top:-44px}
.sec{padding:28px 0}
.sec h2{font-size:26px;margin:0 0 14px;font-weight:800}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.tile{background:#fff;border-radius:22px;padding:22px;box-shadow:0 2px 10px rgba(15,42,92,.08);display:flex;flex-direction:column;gap:10px}
.ic{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center}
.tile b{font-size:17px}.tile span{color:var(--muted);font-size:14px}
.list{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px}
.list a{display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:12px 14px;text-decoration:none;color:var(--navy);font-weight:700;font-size:14px;box-shadow:0 2px 6px rgba(15,42,92,.06)}
.list a .ic{width:40px;height:40px;min-width:40px}
.bubble{display:flex;gap:12px;align-items:flex-end}
.bubble .medal{width:52px;height:52px;min-width:52px}.bubble .medal img{width:44px;height:44px}
.say{background:#fff;color:var(--navy);border:1.5px solid var(--gold);border-radius:4px 20px 20px 20px;padding:14px 18px;font-size:18px;font-weight:600}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;counter-reset:s}
.step{background:#fff;border-radius:22px;padding:20px;box-shadow:0 2px 10px rgba(15,42,92,.08);display:flex;gap:14px;align-items:flex-start;font-weight:600}
.step:before{counter-increment:s;content:counter(s);min-width:40px;height:40px;border-radius:50%;background:var(--blue);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800}
.badge{display:inline-flex;align-items:center;gap:8px;border-radius:16px;padding:6px 14px;font-size:13px;font-weight:800}
.result{margin-top:14px;display:none}.result.on{display:block}
.res-box{border-radius:16px;padding:14px;background:var(--bg)}
.res-box h3{margin:6px 0;font-size:17px}.res-box p{margin:0;font-size:14px;color:#3B4663}
.err{color:var(--red);font-weight:700;font-size:14px}
.legal{max-width:820px}.legal h1{font-size:32px}.legal h2{font-size:20px;margin-top:28px}.legal p,.legal li{font-size:16px}
.ftr{background:#fff;margin-top:40px;padding:24px 0;font-size:13px;color:var(--muted);text-align:center}
.ftr a{margin:0 6px}
.news{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.ncard{display:flex;gap:14px;align-items:flex-start;background:#fff;border-radius:20px;padding:18px;text-decoration:none;color:var(--navy);box-shadow:0 2px 10px rgba(15,42,92,.08)}
.ncard>span:last-child{display:flex;flex-direction:column;gap:4px}.ncard small{color:var(--muted);font-weight:700;font-size:12px}.ncard b{font-size:16px;line-height:1.3}.ncard span span{color:var(--muted);font-size:14px}
.art ul{padding-left:20px}.art li{margin:0 0 8px;font-size:16px}.art .src li{font-size:14px}
.crumb{font-size:13px;color:#D6E0F2;margin-bottom:14px}.crumb a{color:#D6E0F2;text-decoration:none}
@media(max-width:640px){.nav a.hide-sm{display:none}}
"""

def lockup(lang):
    words = "".join(f"<span>{E(w)}</span>" for w in T[lang]["tag"].split())
    return (f'<a class="brand" href="{T[lang]["home"]}" aria-label="CaseAlerta">'
            f'<span class="medal"><img src="/sello.png" alt="" width="48" height="48"></span>'
            f'<span class="lock"><span class="word">CASEALERTA</span><span class="rib"></span><span class="tag">{words}</span></span></a>')

def page(lang, title, desc, path, body, alt_path=None, jsonld=None, og_type="website"):
    t = T[lang]
    alt = alt_path or T[t["other"]]["home"]
    hreflang = ""
    if alt_path:
        es_p, en_p = (path, alt_path) if lang == "es" else (alt_path, path)
        hreflang = (f'<link rel="alternate" hreflang="es" href="{SITE}{es_p}">'
                    f'<link rel="alternate" hreflang="en" href="{SITE}{en_p}">'
                    f'<link rel="alternate" hreflang="x-default" href="{SITE}{es_p}">')
    ld = f'<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False)}</script>' if jsonld else ""
    return f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title><meta name="description" content="{E(desc)}">
<link rel="canonical" href="{SITE}{path}">{hreflang}
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="CaseAlerta"><meta property="og:locale" content="{'es_US' if lang=='es' else 'en_US'}"><meta name="twitter:card" content="summary"><meta property="og:title" content="{E(title)}"><meta property="og:description" content="{E(desc)}"><meta property="og:image" content="{SITE}/sello.png"><meta property="og:url" content="{SITE}{path}">
<link rel="icon" href="/sello.png"><meta name="theme-color" content="#1F4FA0">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&family=Cinzel:wght@700&display=swap">
<link rel="stylesheet" href="/s.css"><link rel="alternate" type="application/rss+xml" title="CaseAlerta" href="{t['news']}rss.xml">{ld}</head><body>
<header class="hdr"><div class="wrap">{lockup(lang)}
<nav class="nav" aria-label="{'Principal' if lang=='es' else 'Main'}"><a class="hide-sm" href="{t['status_base']}">{E(t['nav_status'])}</a><a class="hide-sm" href="{t['news']}">{E(t['nav_news'])}</a>
<a href="{alt}" hreflang="{t['other']}">{ICON['globe']}{t['other_label']}</a><a class="cta" href="{t['home']}#consulta">{ICON['search']}{'Consultar' if lang=='es' else 'Check'}</a></nav></div></header>
{body}
<footer class="ftr"><div class="wrap">CaseAlerta · VARGER Group LLC · Conroe, Texas · {'No somos USCIS ni un despacho de abogados. Explicaciones con IA, no es asesoría legal.' if lang=='es' else 'We are not USCIS or a law firm. AI-assisted explanations, not legal advice.'}<br>
<a href="{t['privacy']}">{'Privacidad' if lang=='es' else 'Privacy'}</a>·<a href="{t['terms']}">{'Términos' if lang=='es' else 'Terms'}</a>·<a href="{t['status_base']}">{E(t['nav_status'])}</a>·<a href="{t['news']}">{E(t['nav_news'])}</a>·<a href="{t['news']}rss.xml">RSS</a>·<a href="/llms.txt">llms.txt</a></div></footer>
<script>window.CA={{fn:"{FN_URL}",k:"{ANON}",lang:"{lang}"}};</script><script src="/a.js" defer></script>
</body></html>"""

def kind_icon(k, size=56):
    fg, bg = KIND[k]
    return f'<span class="ic" style="background:{bg};color:{fg};width:{size}px;height:{size}px;min-width:{size}px">{ICON[k]}</span>'

def lookup_card(lang):
    es = lang == "es"
    return f"""<div class="card lookup" id="consulta">
<div style="display:flex;align-items:center;gap:10px;font-size:18px;font-weight:800"><span class="ic" style="background:#E6EEFA;color:var(--blue);width:44px;height:44px">{ICON['search']}</span>{'Revisa tu caso gratis' if es else 'Check your case for free'}</div>
<form id="lk" novalidate><label for="rcpt">{'Número de recibo (13 caracteres)' if es else 'Receipt number (13 characters)'}</label>
<input id="rcpt" name="rcpt" inputmode="text" autocomplete="off" placeholder="IOE0912345678" maxlength="15" required>
<button class="btn full" type="submit">{'Ver mi estatus' if es else 'See my status'}</button></form>
<div class="chips"><span class="chip">{'Sin cuenta' if es else 'No account'}</span><span class="chip">{'Sin anuncios' if es else 'No ads'}</span><span class="chip">{'No guardamos tu recibo' if es else 'We do not store your receipt'}</span></div>
<div class="result" id="res" aria-live="polite"></div></div>"""

def write(path, content):
    full = os.path.join(OUT, path.lstrip("/"))
    if path.endswith("/"): full = os.path.join(full, "index.html")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(content)

def crumbs(lang, items):
    return {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u} for i, (n, u) in enumerate(items)]}

NEWS = []
for fn in sorted(os.listdir(os.path.join(BASE, "news"))):
    if fn.endswith(".json"):
        NEWS.append(json.load(open(os.path.join(BASE, "news", fn), encoding="utf-8")))
NEWS.sort(key=lambda a: (a["date"], a["type"] == "news"), reverse=True)
MONTHS_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]

def fdate(lang, d):
    y, m, dd = map(int, d.split("-"))
    return f"{dd} de {MONTHS_ES[m-1]} de {y}" if lang == "es" else datetime.date(y, m, dd).strftime("%B %-d, %Y")

def news_path(lang, a):
    return f'{T[lang]["news"]}{a["slug_" + lang]}/'

def news_cards(lang, items):
    es = lang == "es"; out = []
    for a in items:
        lbl = ("Noticia" if es else "News") if a["type"] == "news" else ("Guía" if es else "Guide")
        ic = "bell" if a["type"] == "news" else "spark"
        bg, fg = ("#FCE8EB", "#C8102E") if a["type"] == "news" else ("#FFF4DB", "#9A6400")
        out.append(f'<a class="ncard" href="{news_path(lang, a)}"><span class="ic" style="background:{bg};color:{fg};width:44px;height:44px;min-width:44px">{ICON[ic]}</span>'
                   f'<span><small>{lbl} · {fdate(lang, a["date"])}</small><b>{E(a["title_" + lang])}</b><span>{E(a["desc_" + lang])}</span></span></a>')
    return "".join(out)

def md(lines):
    h, ul = [], False
    for ln in lines:
        if ln.startswith("- "):
            if not ul: h.append("<ul>"); ul = True
            h.append(f"<li>{E(ln[2:])}</li>"); continue
        if ul: h.append("</ul>"); ul = False
        h.append(f"<h2>{E(ln[3:])}</h2>" if ln.startswith("## ") else f"<p>{E(ln)}</p>")
    if ul: h.append("</ul>")
    return "".join(h)

def news_index(lang):
    es = lang == "es"; t = T[lang]
    body = f"""<section class="hero" style="padding-bottom:70px"><div class="wrap"><h1>{E(t['nav_news'])}</h1>
<p class="lead">{'Lo nuevo de USCIS y guías prácticas, explicado en lenguaje claro. Con fuentes oficiales.' if es else 'What is new at USCIS and practical guides, in plain language. With official sources.'}</p></div></section>
<main class="wrap main-pull"><div class="news">{news_cards(lang, NEWS)}</div></main>"""
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": t["nav_news"], "url": SITE + t["news"], "inLanguage": lang,
          "hasPart": [{"@type": "NewsArticle" if a["type"] == "news" else "Article", "headline": a["title_" + lang], "url": SITE + news_path(lang, a), "datePublished": a["date"]} for a in NEWS]}
    write(t["news"], page(lang, f'{t["nav_news"]} · CaseAlerta', ('Noticias de USCIS y guías de inmigración en español, con fuentes oficiales.' if es else 'USCIS news and immigration guides in plain English, with official sources.'),
          t["news"], body, alt_path=T[t["other"]]["news"], jsonld=ld))

def news_page(lang, a):
    es = lang == "es"; t = T[lang]; o = t["other"]
    path = news_path(lang, a); opath = news_path(o, a)
    src = "".join(f'<li><a href="{E(x["u"])}" rel="noopener" target="_blank">{E(x["t"])}</a></li>' for x in a["sources"])
    lbl = ("Noticia" if es else "News") if a["type"] == "news" else ("Guía" if es else "Guide")
    body = f"""<section class="hero" style="padding-bottom:70px"><div class="wrap">
<nav class="crumb" aria-label="{'Ruta' if es else 'Breadcrumb'}"><a href="{t['home']}">{'Inicio' if es else 'Home'}</a> › <a href="{t['news']}">{E(t['nav_news'])}</a></nav>
<span class="badge" style="background:#fff;color:var(--navy)">{lbl} · <time datetime="{a['date']}">{fdate(lang, a['date'])}</time></span>
<h1 style="margin-top:14px">{E(a['title_' + lang])}</h1><p class="lead">{E(a['desc_' + lang])}</p></div></section>
<main class="wrap main-pull"><article class="card legal art">{md(a['body_' + lang])}
<h2>{'Fuentes' if es else 'Sources'}</h2><ul class="src">{src}</ul>
<p style="font-size:13px;color:var(--muted)">{'Resumen informativo preparado por CaseAlerta con apoyo de IA a partir de fuentes oficiales. No es asesoría legal.' if es else 'Informational summary prepared by CaseAlerta with AI assistance from official sources. Not legal advice.'}</p></article>
<section class="sec"><div class="card" style="background:var(--navy);color:#fff;display:flex;gap:18px;align-items:center;flex-wrap:wrap">
<span class="ic" style="background:var(--gold);color:var(--navy)">{ICON['bell']}</span><div style="flex:1 1 260px"><b style="font-size:20px">{'¿Tienes un caso en trámite?' if es else 'Have a pending case?'}</b><br><span style="color:#D6E0F2">{'Revísalo gratis y te avisamos cuando cambie.' if es else 'Check it for free and we will alert you when it changes.'}</span></div>
<a class="btn red" href="{t['home']}#consulta">{E(t['cta'])}</a></div></section>
<section class="sec"><h2>{'Más para leer' if es else 'Read more'}</h2><div class="news">{news_cards(lang, [x for x in NEWS if x is not a][:3])}</div></section></main>"""
    art = {"@type": "NewsArticle" if a["type"] == "news" else "Article", "headline": a["title_" + lang], "description": a["desc_" + lang],
           "datePublished": a["date"], "dateModified": a.get("updated", a["date"]), "inLanguage": lang, "mainEntityOfPage": SITE + path,
           "image": f"{SITE}/sello.png", "author": {"@type": "Organization", "name": "CaseAlerta", "url": SITE},
           "publisher": {"@type": "Organization", "name": "VARGER Group LLC", "logo": {"@type": "ImageObject", "url": f"{SITE}/sello.png"}},
           "citation": [x["u"] for x in a["sources"]]}
    bc = crumbs(lang, [(("Inicio" if es else "Home"), t["home"]), (t["nav_news"], t["news"]), (a["title_" + lang], path)])
    write(path, page(lang, f'{a["title_" + lang]} · CaseAlerta', a["desc_" + lang], path, body, alt_path=opath,
          jsonld={"@context": "https://schema.org", "@graph": [art, bc]}, og_type="article"))
    return path

def rss(lang):
    t = T[lang]
    items = "".join(f"<item><title>{E(a['title_' + lang])}</title><link>{SITE}{news_path(lang, a)}</link><guid>{SITE}{news_path(lang, a)}</guid>"
                    f"<pubDate>{datetime.datetime.strptime(a['date'], '%Y-%m-%d').strftime('%a, %d %b %Y 12:00:00 +0000')}</pubDate><description>{E(a['desc_' + lang])}</description></item>" for a in NEWS[:30])
    full = os.path.join(OUT, t["news"].lstrip("/"), "rss.xml")
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, "w", encoding="utf-8").write(f'<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>CaseAlerta · {E(t["nav_news"])}</title>'
        f'<link>{SITE}{t["news"]}</link><description>CaseAlerta</description><language>{"es-us" if lang == "es" else "en-us"}</language>{items}</channel></rss>')

def home(lang):
    es = lang == "es"; t = T[lang]
    links = "".join(f'<a href="{t["status_base"]}{c["slug_es" if es else "slug_en"]}/">{kind_icon(c["kind"],40)}{E(c["title_es"] if es else c["code"])}</a>' for c in CAT[:12])
    tiles = [("bell", "#FCE8EB", "#C8102E", "Aviso al instante" if es else "Instant alerts", "Globo en tu celular, en tu computadora y correo." if es else "Push on your phone, your computer and email."),
             ("spark", "#FFF4DB", "#9A6400", "Te lo explico" if es else "Plain explanations", "Qué significa y qué sigue, en tu idioma." if es else "What it means and what is next, in your language."),
             ("shield", "#E3F5EA", "#1E7A46", "Sin anuncios, nunca" if es else "No ads, ever", "No vendemos ni compartimos tus datos." if es else "We never sell or share your data.")]
    tiles_html = "".join(f'<div class="tile"><span class="ic" style="background:{bg};color:{fg}">{ICON[i]}</span><b>{E(a)}</b><span>{E(b)}</span></div>' for i, bg, fg, a, b in tiles)
    body = f"""<section class="hero"><div class="wrap grid2"><div class="main">
<h1>{'Tu caso de USCIS, claro y a tiempo' if es else 'Your USCIS case, clear and on time'}</h1>
<p class="lead">{'Te avisamos en cuanto cambie tu caso y te explicamos qué significa y qué sigue. En español y en inglés.' if es else 'We alert you the moment your case changes and explain what it means and what comes next. In English and Spanish.'}</p>
<div class="bubble" style="margin-top:22px"><span class="medal"><img src="/sello.png" alt="" width="44" height="44"></span><div class="say">{'Pega tu número de recibo y te digo cómo va.' if es else 'Paste your receipt number and I will tell you how it is going.'}</div></div>
</div><div class="side">{lookup_card(lang)}</div></div></section>
<main class="wrap main-pull"><div class="tiles">{tiles_html}</div>
<section class="sec"><h2>{'Estatus más buscados' if es else 'Most searched statuses'}</h2><div class="list">{links}</div>
<p><a href="{t['status_base']}">{'Ver todos los estatus →' if es else 'See all statuses →'}</a></p></section>
<section class="sec"><h2>{E(t['nav_news'])}</h2><div class="news">{news_cards(lang, NEWS[:3])}</div><p><a href="{t['news']}">{'Ver todas las noticias y guías →' if es else 'See all news and guides →'}</a></p></section></main>"""
    title = "CaseAlerta — Alertas y explicación de tu caso USCIS" if es else "CaseAlerta — USCIS case status alerts, explained"
    desc = ("Consulta gratis el estatus de tu caso USCIS y recibe avisos cuando cambie, con explicación en español. Sin anuncios." if es
            else "Check your USCIS case status for free and get alerts when it changes, explained in plain English and Spanish. No ads.")
    ld = {"@context": "https://schema.org", "@type": "WebSite", "name": "CaseAlerta", "url": SITE, "inLanguage": lang,
          "publisher": {"@type": "Organization", "name": "VARGER Group LLC", "url": SITE, "logo": f"{SITE}/sello.png"}}
    write(t["home"], page(lang, title, desc, t["home"], body, alt_path=T[t["other"]]["home"], jsonld=ld))

def status_index(lang):
    es = lang == "es"; t = T[lang]
    links = "".join(f'<a href="{t["status_base"]}{c["slug_es" if es else "slug_en"]}/">{kind_icon(c["kind"],40)}{E(c["title_es"] if es else c["code"])}</a>' for c in CAT)
    body = f"""<section class="hero" style="padding-bottom:70px"><div class="wrap"><h1>{'Estatus de USCIS explicados' if es else 'USCIS case statuses explained'}</h1>
<p class="lead">{'Qué significa cada estatus y qué hacer, en lenguaje claro.' if es else 'What each status means and what to do, in plain language.'}</p></div></section>
<main class="wrap main-pull"><div class="list">{links}</div></main>"""
    write(t["status_base"], page(lang, ('Estatus de USCIS explicados · CaseAlerta' if es else 'USCIS statuses explained · CaseAlerta'),
          ('Los estatus de casos USCIS explicados en español: qué significan y qué sigue.' if es else 'Every common USCIS case status explained: what it means and what to do next.'),
          t["status_base"], body, alt_path=T[t["other"]]["status_base"]))

def status_page(lang, c):
    es = lang == "es"; t = T[lang]; o = T[t["other"]]
    slug = c["slug_es"] if es else c["slug_en"]; oslug = c["slug_en"] if es else c["slug_es"]
    path = f'{t["status_base"]}{slug}/'; opath = f'{o["status_base"]}{oslug}/'
    title_h = c["title_es"] if es else c["code"]
    meaning = c["mes"] if es else c["men"]; steps = c["ses"] if es else c["sen"]
    fg, bg = KIND[c["kind"]]
    steps_html = "".join(f'<div class="step">{E(s)}</div>' for s in steps)
    body = f"""<section class="hero"><div class="wrap grid2"><div class="main">
<nav class="crumb" aria-label="{'Ruta' if es else 'Breadcrumb'}"><a href="{t['home']}">{'Inicio' if es else 'Home'}</a> › <a href="{t['status_base']}">{E(t['nav_status'])}</a></nav>
<span class="badge" style="background:{bg};color:{fg}">{ICON[c['kind']].replace('width="26" height="26"','width="16" height="16"')}{KIND_LABEL[lang][c['kind']]}</span>
<h1 style="margin-top:14px">“{E(title_h)}”</h1>
{'<p class="lead">Texto oficial en inglés: <b>' + E(c['code']) + '</b></p>' if es else ''}
<div class="bubble" style="margin-top:20px"><span class="medal"><img src="/sello.png" alt="" width="44" height="44"></span><div class="say">{E(meaning)}</div></div>
</div><div class="side">{lookup_card(lang)}</div></div></section>
<main class="wrap main-pull"><section class="sec" style="padding-top:0"><div class="card"><h2 style="margin-top:0">{'Qué hacer' if es else 'What to do'}</h2><div class="steps">{steps_html}</div></div></section>
<section class="sec"><div class="card" style="background:var(--navy);color:#fff;display:flex;gap:18px;align-items:center;flex-wrap:wrap">
<span class="ic" style="background:var(--gold);color:var(--navy)">{ICON['bell']}</span><div style="flex:1 1 260px"><b style="font-size:20px">{'Te aviso cuando cambie' if es else 'I will alert you when it changes'}</b><br><span style="color:#D6E0F2">{'Globo en tu celular o computadora y correo. Sin anuncios.' if es else 'Push on your phone or computer, plus email. No ads.'}</span></div>
<a class="btn red" href="{t['home']}#consulta">{E(t['cta'])}</a></div></section>
<p style="font-size:13px;color:var(--muted)">{'Explicación generada con IA a partir del estatus oficial de USCIS y revisada por CaseAlerta. No es asesoría legal.' if es else 'AI-assisted explanation based on the official USCIS status, reviewed by CaseAlerta. Not legal advice.'}</p></main>"""
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": lang, "mainEntity": [
        {"@type": "Question", "name": (f'¿Qué significa "{c["code"]}" en USCIS?' if es else f'What does "{c["code"]}" mean on USCIS?'),
         "acceptedAnswer": {"@type": "Answer", "text": meaning}},
        {"@type": "Question", "name": ("¿Qué hago ahora?" if es else "What should I do now?"),
         "acceptedAnswer": {"@type": "Answer", "text": " ".join(steps)}}]}
    title = (f'"{c["code"]}" — qué significa en USCIS ({c["title_es"]}) · CaseAlerta' if es
             else f'"{c["code"]}" — what it means on USCIS · CaseAlerta')
    bc = crumbs(lang, [(('Inicio' if es else 'Home'), t['home']), (t['nav_status'], t['status_base']), (title_h, path)])
    write(path, page(lang, title, meaning, path, body, alt_path=opath, jsonld={"@context": "https://schema.org", "@graph": [faq, bc]}))
    return path

LEGAL = {
"privacidad": ("es", "Política de privacidad", "privacy", [
 ("Quiénes somos", "CaseAlerta es un servicio de VARGER Group LLC, empresa de Texas, EE.UU. Contacto: sales@vargersoft.com."),
 ("Qué datos recopilamos", "Solo lo necesario para el servicio: tu correo electrónico, los números de recibo que tú agregas, el estatus oficial que devuelve USCIS para esos recibos, tus preferencias de idioma y de avisos, y los tokens técnicos para enviarte notificaciones. Si eres empresa, el nombre de la organización y de los beneficiarios que tú capturas. En la consulta gratis de la web no guardamos tu número de recibo."),
 ("Para qué los usamos", "Únicamente para consultar el estatus de tus casos por el canal oficial de USCIS, avisarte cuando cambien (globo en tu celular o computadora y correo) y explicarte el estatus. No usamos tus datos para publicidad."),
 ("No vendemos tus datos", "No vendemos, rentamos ni compartimos tus datos personales ni los de tus casos con terceros, tampoco en forma agregada o anónima, salvo que tú des tu consentimiento activo y por separado. No mostramos anuncios ni usamos rastreo entre apps o sitios."),
 ("Proveedores que nos ayudan", "Usamos proveedores de infraestructura que procesan datos solo por cuenta nuestra y bajo contrato: alojamiento y base de datos (Supabase, Vercel), envío de correo (Resend), notificaciones (Expo y los servicios de notificación de tu navegador) y cobros (Stripe, Apple, Google y RevenueCat). Ninguno puede usar tus datos para sus propios fines."),
 ("Abogados", "Solo compartimos tus datos con un abogado si tú lo pides con el botón \"Quiero hablar con un abogado\". Antes de enviar algo te mostramos qué se compartirá."),
 ("Inteligencia artificial", "Las explicaciones de los estatus se generan con apoyo de IA a partir del texto oficial de USCIS. No usamos tus datos personales para entrenar modelos. Las explicaciones no son asesoría legal."),
 ("Cuánto tiempo los guardamos", "Mientras tu cuenta esté activa. Si borras tu cuenta, borramos tus datos y casos en un plazo de 30 días, salvo lo que la ley nos obligue a conservar (por ejemplo, registros de pago)."),
 ("Tus derechos", "Puedes ver, corregir, descargar o borrar tus datos en cualquier momento desde la app o escribiendo a sales@vargersoft.com. Puedes apagar los avisos cuando quieras."),
 ("Seguridad", "Usamos conexiones cifradas (HTTPS), control de acceso por usuario en la base de datos y llaves guardadas en bóvedas cifradas. Si ocurriera un incidente que afecte tus datos, te avisaremos sin demora indebida."),
 ("Menores", "CaseAlerta no está dirigido a menores de 13 años y no recopilamos sus datos a sabiendas."),
 ("Relación con USCIS", "CaseAlerta no es una agencia de gobierno ni está afiliado a USCIS. Consultamos el estatus mediante la API oficial de USCIS (programa Torch)."),
 ("Cambios", "Si cambiamos esta política, publicaremos la nueva versión aquí con su fecha y te avisaremos en la app si el cambio es importante."),
]),
"privacy": ("en", "Privacy policy", "privacidad", [
 ("Who we are", "CaseAlerta is a service of VARGER Group LLC, a Texas, USA company. Contact: sales@vargersoft.com."),
 ("What we collect", "Only what the service needs: your email, the receipt numbers you add, the official status USCIS returns for them, your language and alert preferences, and technical tokens to send you notifications. For businesses, the organization name and beneficiary names you enter. The free web lookup does not store your receipt number."),
 ("How we use it", "Only to check your cases through the official USCIS channel, alert you when they change (push on your phone or computer and email) and explain the status. We do not use your data for advertising."),
 ("We do not sell your data", "We do not sell, rent or share your personal or case data with third parties, including in aggregated or anonymized form, unless you give separate, active consent. We show no ads and use no cross-app or cross-site tracking."),
 ("Service providers", "We use infrastructure providers that process data only on our behalf under contract: hosting and database (Supabase, Vercel), email (Resend), notifications (Expo and your browser's push service) and payments (Stripe, Apple, Google, RevenueCat). None may use your data for their own purposes."),
 ("Attorneys", "We share your data with an attorney only if you request it with the \"Talk to an attorney\" button. We show you what will be shared before sending anything."),
 ("Artificial intelligence", "Status explanations are generated with AI assistance from the official USCIS text. We do not use your personal data to train models. Explanations are not legal advice."),
 ("Retention", "While your account is active. If you delete your account, we delete your data and cases within 30 days, except records the law requires us to keep (such as payment records)."),
 ("Your rights", "You can view, correct, download or delete your data at any time in the app or by writing to sales@vargersoft.com. You can turn alerts off whenever you want."),
 ("Security", "We use encrypted connections (HTTPS), per-user access control in the database and keys stored in encrypted vaults. If an incident affects your data, we will notify you without undue delay."),
 ("Children", "CaseAlerta is not directed to children under 13 and we do not knowingly collect their data."),
 ("Relationship with USCIS", "CaseAlerta is not a government agency and is not affiliated with USCIS. We check status through the official USCIS API (Torch program)."),
 ("Changes", "If we change this policy we will post the new version here with its date and notify you in the app if the change is material."),
]),
"terminos": ("es", "Términos de uso", "terms", [
 ("Aceptación", "Al usar CaseAlerta aceptas estos términos. El servicio lo presta VARGER Group LLC (Texas, EE.UU.)."),
 ("Qué es CaseAlerta", "Una herramienta que consulta el estatus de casos por la API oficial de USCIS, te avisa de cambios y te explica el estatus en lenguaje claro. No es un despacho de abogados, no da asesoría legal y no está afiliada a USCIS."),
 ("Sin garantía de resultados", "Mostramos la información que entrega USCIS. Puede haber retrasos o errores en la fuente. Los rangos de tiempo son típicos, no promesas. Para decisiones legales, consulta a un abogado."),
 ("Tu cuenta", "Eres responsable de la información que agregas y de mantener tu acceso seguro. Solo agrega números de recibo de casos propios o que tengas autorización para seguir."),
 ("Pagos y suscripciones", "Los planes de pago se cobran por adelantado según el periodo elegido. En la app, los cobros los procesa Apple o Google; en la web, Stripe. Puedes cancelar cuando quieras; el acceso sigue hasta el fin del periodo pagado."),
 ("Uso aceptable", "No se permite usar el servicio para fines ilegales, consultar casos sin autorización, intentar vulnerar la seguridad ni extraer datos de forma automatizada sin permiso."),
 ("Limitación de responsabilidad", "En la medida que permita la ley, VARGER Group LLC no responde por daños indirectos derivados del uso del servicio o de retrasos de USCIS."),
 ("Ley aplicable", "Estos términos se rigen por las leyes del estado de Texas, EE.UU."),
 ("Contacto", "sales@vargersoft.com"),
]),
"terms": ("en", "Terms of use", "terminos", [
 ("Acceptance", "By using CaseAlerta you accept these terms. The service is provided by VARGER Group LLC (Texas, USA)."),
 ("What CaseAlerta is", "A tool that checks case status through the official USCIS API, alerts you to changes and explains the status in plain language. It is not a law firm, does not give legal advice and is not affiliated with USCIS."),
 ("No guarantee of outcomes", "We show the information USCIS provides. The source may have delays or errors. Time ranges are typical, not promises. For legal decisions, consult an attorney."),
 ("Your account", "You are responsible for the information you add and for keeping your access secure. Only add receipt numbers for your own cases or cases you are authorized to follow."),
 ("Payments and subscriptions", "Paid plans are billed in advance for the chosen period. In the app, Apple or Google process payments; on the web, Stripe. You can cancel anytime; access continues until the end of the paid period."),
 ("Acceptable use", "You may not use the service for unlawful purposes, look up cases without authorization, attempt to breach security or scrape data without permission."),
 ("Limitation of liability", "To the extent permitted by law, VARGER Group LLC is not liable for indirect damages arising from use of the service or from USCIS delays."),
 ("Governing law", "These terms are governed by the laws of the State of Texas, USA."),
 ("Contact", "sales@vargersoft.com"),
]),
}

def legal(key):
    lang, title, other, secs = LEGAL[key]
    es = lang == "es"
    body_secs = "".join(f"<h2>{E(h)}</h2><p>{E(p)}</p>" for h, p in secs)
    upd = "Última actualización: 19 de octubre de 2026" if es else "Last updated: October 19, 2026"
    body = f'<main class="wrap"><article class="legal card" style="margin-top:28px"><h1 style="margin-top:0">{E(title)}</h1><p style="color:var(--muted)">{upd}</p>{body_secs}</article></main>'
    write(f"/{key}/", page(lang, f"{title} · CaseAlerta", f"{title} — CaseAlerta (VARGER Group LLC)", f"/{key}/", body, alt_path=f"/{other}/"))

JS = r"""
(function(){var f=document.getElementById('lk');if(!f)return;var r=document.getElementById('res'),es=CA.lang==='es';
f.addEventListener('submit',async function(e){e.preventDefault();var v=document.getElementById('rcpt').value.replace(/[\s-]/g,'').toUpperCase();
if(!/^([A-Z]{3}[0-9]{10}|[A-Z]{3}\*[0-9]{9})$/.test(v)){r.className='result on';r.innerHTML='<p class="err">'+(es?'Son 3 letras y 10 números, por ejemplo IOE0912345678.':'It is 3 letters and 10 digits, e.g. IOE0912345678.')+'</p>';return;}
r.className='result on';r.innerHTML='<p>'+(es?'Consultando a USCIS…':'Checking with USCIS…')+'</p>';
try{var x=await fetch(CA.fn,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+CA.k,apikey:CA.k},body:JSON.stringify({receipt_number:v})});var j=await x.json();
if(!x.ok||!j.ok){r.innerHTML='<p class="err">'+(j.message_es&&es?j.message_es:(j.message||'Error'))+'</p>';return;}
var c=j.case,t=es?(c.status_es||c.status_en):c.status_en,d=es?(c.desc_es||c.desc_en):c.desc_en;
var div=document.createElement('div');div.className='res-box';var a=document.createElement('b');a.textContent=(c.form_type||'')+' · '+v;var h=document.createElement('h3');h.textContent=t||'';var p=document.createElement('p');p.textContent=d||'';
div.appendChild(a);div.appendChild(h);div.appendChild(p);r.innerHTML='';r.appendChild(div);}
catch(err){r.innerHTML='<p class="err">'+(es?'No pudimos conectar. Intenta de nuevo.':'Could not connect. Try again.')+'</p>';}});})();
"""

def main():
    if os.path.exists(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    open(os.path.join(OUT, "s.css"), "w").write(CSS)
    open(os.path.join(OUT, "a.js"), "w").write(JS)
    shutil.copy(os.path.join(BASE, "sello.png"), os.path.join(OUT, "sello.png"))
    urls = []
    for lang in ("es", "en"):
        home(lang); status_index(lang); urls += [T[lang]["home"], T[lang]["status_base"]]
        for c in CAT: urls.append(status_page(lang, c))
    for lang in ("es", "en"):
        news_index(lang); rss(lang); urls.append(T[lang]["news"])
        for a in NEWS: urls.append(news_page(lang, a))
    for k in LEGAL: legal(k); urls.append(f"/{k}/")
    sm = "".join(f"<url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod></url>" for u in urls)
    open(os.path.join(OUT, "sitemap.xml"), "w").write(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sm}</urlset>')
    bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "Googlebot"]
    open(os.path.join(OUT, "robots.txt"), "w").write("".join(f"User-agent: {b}\nAllow: /\n\n" for b in bots) + f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n")
    open(os.path.join(OUT, f"{INDEXNOW_KEY}.txt"), "w").write(INDEXNOW_KEY)
    open(os.path.join(OUT, "urls.txt"), "w").write("\n".join(SITE + u for u in urls) + "\n")
    llms = ["# CaseAlerta", "> Bilingual (English/Spanish) USCIS case status alerts and plain-language explanations. By VARGER Group LLC. No ads, no data sales. Not legal advice.", "",
            "## USCIS statuses explained (English)"] + [f"- [{c['code']}]({SITE}/status/{c['slug_en']}/): {c['men']}" for c in CAT] + ["", "## Estatus de USCIS explicados (español)"] + \
           [f"- [{c['title_es']}]({SITE}/estatus/{c['slug_es']}/): {c['mes']}" for c in CAT] + ["", "## News and guides / Noticias y guías"] + \
           [f"- [{a['title_en']}]({SITE}{news_path('en', a)}) / [{a['title_es']}]({SITE}{news_path('es', a)}) ({a['date']})" for a in NEWS] + \
           ["", "## Policies", f"- [Privacy]({SITE}/privacy/)", f"- [Terms]({SITE}/terms/)", "", f"Full text for AI: {SITE}/llms-full.txt"]
    full = ["# CaseAlerta — full reference", ""]
    for a in NEWS:
        full += [f"## {a['title_en']}", f"Date: {a['date']} · URL: {SITE}{news_path('en', a)}", ""] + a["body_en"] + ["", "Sources: " + "; ".join(x["u"] for x in a["sources"]), ""]
    for c in CAT:
        full += [f"## USCIS status: {c['code']}", c["men"], "Next steps: " + " ".join(c["sen"]), f"URL: {SITE}/status/{c['slug_en']}/", ""]
    open(os.path.join(OUT, "llms-full.txt"), "w").write("\n".join(full) + "\n")
    open(os.path.join(OUT, "llms.txt"), "w").write("\n".join(llms) + "\n")
    json.dump({"cleanUrls": True, "trailingSlash": True, "headers": [{"source": "/(.*)", "headers": [
        {"key": "X-Content-Type-Options", "value": "nosniff"}, {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
        {"key": "X-Frame-Options", "value": "DENY"}, {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"}]}]},
        open(os.path.join(OUT, "vercel.json"), "w"))
    print(len(urls), "pages")

main()
