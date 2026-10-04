"use client";

import Image from "next/image";
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Theme = "apricot" | "rose" | "midnight" | "meadow";
type PaperStyle = "lined" | "plain";
type Letter = { id: string; title: string; body: string; month: string; kind: "monthly" | "little"; author: "sander" | "cristine"; attachmentUrl?: string; theme?: Theme; paperStyle?: PaperStyle; signOff?: string; createdAt: string };

export default function Home() {
  const [colorMode, setColorMode] = useState<"dark" | "light">("dark");
  const [letters, setLetters] = useState<Letter[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [note, setNote] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Letter["kind"]>("little");
  const [theme, setTheme] = useState<Theme>("apricot");
  const [paperStyle, setPaperStyle] = useState<PaperStyle>("lined");
  const [signOff, setSignOff] = useState("");
  const [notice, setNotice] = useState("");
  const [isAuthor, setIsAuthor] = useState(false);
  const [writer, setWriter] = useState<"sander" | "cristine" | null>(null);
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [boothPhotos, setBoothPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const [boothTemplate, setBoothTemplate] = useState<"portrait" | "landscape">("portrait");
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [boothCrops, setBoothCrops] = useState([{ zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }, { zoom: 1, x: 0, y: 0 }]);
  const boothInput = useRef<HTMLInputElement>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingCrop, setPendingCrop] = useState({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    fetch("/api/author").then((response) => response.json()).then((data) => { setWriter(data.author); setIsAuthor(Boolean(data.author)); }).catch(() => setLoginMessage("Author access is unavailable right now."));
    fetch("/api/letters").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => setLetters(data)).catch(() => setNotice("Letters are not available yet."));
  }, []);

  function toggleColorMode() {
    setColorMode((current) => { const next = current === "dark" ? "light" : "dark"; window.localStorage.setItem("memoir-color-mode", next); return next; });
  }

  const monthlyLetters = useMemo(() => letters.filter((letter) => letter.kind === "monthly"), [letters]);
  const sanderLetters = useMemo(() => letters.filter((letter) => letter.author === "sander"), [letters]);
  const cristineLetters = useMemo(() => letters.filter((letter) => letter.author === "cristine"), [letters]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/author", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    const data = await response.json();
    setWriter(data.author);
    setIsAuthor(Boolean(data.author));
    setLoginMessage(data.author ? "Author desk unlocked." : data.message);
    if (data.author) setPassword("");
  }

  function chooseBoothFrame(index: number) {
    setSelectedFrame(index);
    if (!boothPhotos[index]) boothInput.current?.click();
  }

  function updateCrop(key: "zoom" | "x" | "y", value: number) {
    setBoothCrops((current) => current.map((crop, index) => index === selectedFrame ? { ...crop, [key]: value } : crop));
  }

  function addBoothPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPendingPhoto(String(reader.result)); setPendingCrop({ zoom: 1, x: 0, y: 0 }); };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, crop: { zoom: number; x: number; y: number }) {
    const scale = Math.max(width / image.width, height / image.height) * crop.zoom;
    const drawnWidth = image.width * scale;
    const drawnHeight = image.height * scale;
    context.drawImage(image, x + (width - drawnWidth) / 2 + crop.x * width / 100, y + (height - drawnHeight) / 2 + crop.y * height / 100, drawnWidth, drawnHeight);
  }

  async function exportBooth() {
    if (!boothPhotos.some(Boolean)) { setNotice("Choose a photo for at least one frame first."); return; }
    const portrait = boothTemplate === "portrait";
    const canvas = document.createElement("canvas"); canvas.width = portrait ? 1200 : 1800; canvas.height = portrait ? 2000 : 1200;
    const context = canvas.getContext("2d"); if (!context) return;
    context.fillStyle = "#f7efd9"; context.fillRect(0, 0, canvas.width, canvas.height);
    const frames = portrait ? [[90, 70, 470, 820], [640, 70, 470, 820], [90, 980, 470, 820], [640, 980, 470, 820]] : [[70, 70, 780, 420], [950, 70, 780, 420], [70, 590, 780, 420], [950, 590, 780, 420]];
    await Promise.all(boothPhotos.map(async (source, index) => { if (!source) return; const image = await new Promise<HTMLImageElement>((resolve) => { const loaded = new window.Image(); loaded.onload = () => resolve(loaded); loaded.src = source; }); const [x, y, width, height] = frames[index]; context.save(); context.beginPath(); context.rect(x, y, width, height); context.clip(); drawCover(context, image, x, y, width, height, boothCrops[index]); context.restore(); }));
    context.fillStyle = "#7d332d"; context.font = portrait ? "italic 54px Georgia" : "italic 48px Georgia"; context.textAlign = "center"; context.fillText("our little photobooth", canvas.width / 2, canvas.height - 55);
    const link = document.createElement("a"); link.download = `our-${boothTemplate}-photobooth.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }
  async function addLetter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) { setNotice("Write the letter first, then submit it."); return; }
    let attachmentUrl: string | undefined;
    if (attachment) { const form = new FormData(); form.append("photo", attachment); const upload = await fetch("/api/uploads", { method: "POST", body: form }); const result = await upload.json(); if (!upload.ok) { setNotice(result.message ?? "Your photo could not be uploaded."); return; } attachmentUrl = result.url; }
    const response = await fetch("/api/letters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, body: note, kind, attachmentUrl, theme, paperStyle, signOff }) });
    const data = await response.json();
    if (!response.ok) { setNotice(data.message ?? "Your letter could not be saved."); return; }
    setLetters((current) => [data as Letter, ...current]);
    setTitle(""); setNote(""); setAttachment(null); setTheme("apricot"); setPaperStyle("lined"); setSignOff(""); setNotice("Your letter has been placed in the drawer.");
  }

  return <main data-mode={colorMode}>
    <nav className="topbar" aria-label="Primary navigation"><a className="wordmark" href="#top">for her, always</a><div><a href="#letters">letters</a><a href="#author">write</a><button className="mode-toggle" type="button" onClick={toggleColorMode} aria-label={`Switch to ${colorMode === "dark" ? "light" : "dark"} mode`}>{colorMode === "dark" ? "light" : "night"}</button></div></nav>

    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy"><p className="eyebrow">A small archive of us</p><h1 id="hero-title">Things I wanted<br />you to keep.</h1><p>Letters for our monthsaries, quiet little thoughts, and all the moments I never want to lose in the noise.</p><a className="text-link" href="#letters">open the letter drawer</a></div>
      <figure className="hero-photo"><Image src="/photos/IMG_3613.webp" alt="A favorite shared memory" width={750} height={1000} priority /><figcaption>kept close to my heart</figcaption></figure>
    </section>

    <section className="keepsake-line"><p>Made slowly. Meant to be read slowly.</p></section>

    <section className="contact-sheet" aria-label="Shared memories"><Image src="/photos/IMG_3530.webp" alt="A shared memory" width={500} height={500}/><Image src="/photos/IMG_20260929_081510_326.webp" alt="A shared memory" width={500} height={500}/><Image src="/photos/cpm35_2026-07-02_1705392DB1E8DE9CB8.webp" alt="A shared memory" width={500} height={500}/><Image src="/photos/cpm35_2026-07-02_1703212A79D365DF21.webp" alt="A shared memory" width={500} height={500}/></section>

    <section id="letters" className="drawer" aria-labelledby="letters-title"><div className="section-intro"><p className="eyebrow">The letter drawers</p><h2 id="letters-title">Two places to leave a piece of your heart.</h2><p>Choose a drawer, then open a letter when the moment feels right.</p></div><div className="letter-drawers"><section className="letter-post-area"><div className="drawer-label"><p className="eyebrow">From Sander</p><h3>Sander&apos;s letters</h3></div><div className="envelope-list">{sanderLetters.length ? sanderLetters.map((letter) => <article className="envelope" key={letter.id}><div><p className="letter-type">{letter.kind === "monthly" ? "Monthsary letter" : "Just because"}</p><h3>{letter.title}</h3><p className="letter-date">{letter.month}</p></div><button type="button" onClick={() => setSelectedLetter(letter)}>open</button></article>) : <p className="empty-state">Sander&apos;s drawer is waiting for its first letter.</p>}</div></section><section className="letter-post-area cristine-drawer"><div className="drawer-label"><p className="eyebrow">From Cristine</p><h3>Cristine&apos;s letters</h3></div><div className="envelope-list">{cristineLetters.length ? cristineLetters.map((letter) => <article className="envelope" key={letter.id}><div><p className="letter-type">{letter.kind === "monthly" ? "Monthsary letter" : "Just because"}</p><h3>{letter.title}</h3><p className="letter-date">{letter.month}</p></div><button type="button" onClick={() => setSelectedLetter(letter)}>open</button></article>) : <p className="empty-state">Cristine&apos;s drawer is waiting for its first letter.</p>}</div></section></div>{notice && <p className="notice" role="status">{notice}</p>}</section>
    <section className="anniversary" aria-labelledby="anniversary-title"><figure><Image src="/photos/IMG_3531.webp" alt="Another shared memory" width={700} height={900}/></figure><div><p className="eyebrow">Our first year</p><h2 id="anniversary-title">A year, held together by letters.</h2><p>Monthsary letters gather here as they are written. One day, this drawer will tell the whole first chapter.</p><div className="chapter-count" aria-label={`${monthlyLetters.length} monthsary letters saved`}>{monthlyLetters.map((letter, index) => <span key={letter.id}>{index + 1}</span>)}{Array.from({ length: Math.max(0, 12 - monthlyLetters.length) }).map((_, index) => <i key={index}/>)}</div></div></section>

    <section className="photobooth" aria-labelledby="photobooth-title"><div><p className="eyebrow">Photo booth</p><h2 id="photobooth-title">Make a little strip of us.</h2><p>Choose a layout, then tap any frame to take or import just that picture. Every frame crops gently to fit while keeping the design intact.</p><input ref={boothInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={addBoothPhoto}/><div className="template-picks" aria-label="Choose a photobooth template"><button type="button" className={boothTemplate === "portrait" ? "active" : ""} onClick={() => setBoothTemplate("portrait")}>portrait strip</button><button type="button" className={boothTemplate === "landscape" ? "active" : ""} onClick={() => setBoothTemplate("landscape")}>landscape postcard</button></div><div className="booth-actions"><button type="button" onClick={() => boothInput.current?.click()}>replace photo in frame {selectedFrame + 1}</button><button type="button" onClick={exportBooth}>export as PNG</button></div>{boothPhotos[selectedFrame] && <div className="photo-adjust" aria-label={`Adjust frame ${selectedFrame + 1}`}><p>Adjust frame {selectedFrame + 1}</p><label>Zoom<input type="range" min="1" max="2.5" step="0.01" value={boothCrops[selectedFrame].zoom} onChange={(event) => updateCrop("zoom", Number(event.target.value))}/></label><label>Move left or right<input type="range" min="-1" max="1" step="0.01" value={boothCrops[selectedFrame].x} onChange={(event) => updateCrop("x", Number(event.target.value))}/></label><label>Move up or down<input type="range" min="-1" max="1" step="0.01" value={boothCrops[selectedFrame].y} onChange={(event) => updateCrop("y", Number(event.target.value))}/></label><button type="button" onClick={() => setBoothCrops((current) => current.map((crop, index) => index === selectedFrame ? { zoom: 1, x: 0, y: 0 } : crop))}>reset frame</button></div>}</div><div className={`booth-strip ${boothTemplate}`}>{boothPhotos.map((photo, index) => <button type="button" className={selectedFrame === index ? "selected" : ""} key={index} onClick={() => chooseBoothFrame(index)} aria-label={`Choose photo for frame ${index + 1}`}>{photo ? <img style={{ transform: `translate(${boothCrops[index].x * 100}%, ${boothCrops[index].y * 100}%) scale(${boothCrops[index].zoom})` }} src={photo} alt={`Photobooth frame ${index + 1}`}/> : <span>frame {index + 1}<small>tap to add</small></span>}</button>)}</div></section><section id="author" className="author-desk" aria-labelledby="author-title"><div><p className="eyebrow">Author desk</p><h2 id="author-title">{isAuthor ? "Write it while it is still warm." : "A private desk for one writer."}</h2><p>{isAuthor ? "Choose the kind of letter, give it a title, then submit it to her drawer." : "The drawer is for her. This desk opens only with the author password."}</p></div>{isAuthor ? <form className="letter-form" onSubmit={addLetter}><label>Letter type<select value={kind} onChange={(event) => setKind(event.target.value as Letter["kind"])}><option value="little">Just because</option><option value="monthly">Monthsary letter</option></select></label><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="The thing I wanted to tell you" required /></label><fieldset className="stationery-options"><legend>Make it yours</legend><p>Choose a complete stationery mood, then fine-tune the paper and closing.</p><div className="theme-swatches" aria-label="Stationery theme">{(["apricot", "rose", "midnight", "meadow"] as Theme[]).map((option) => <button type="button" key={option} className={`theme-swatch ${option} ${theme === option ? "selected" : ""}`} onClick={() => setTheme(option)} aria-pressed={theme === option}><span aria-hidden="true" />{option}</button>)}</div><div className="paper-options" aria-label="Paper style"><button type="button" className={paperStyle === "lined" ? "selected" : ""} onClick={() => setPaperStyle("lined")} aria-pressed={paperStyle === "lined"}>Ruled paper</button><button type="button" className={paperStyle === "plain" ? "selected" : ""} onClick={() => setPaperStyle("plain")} aria-pressed={paperStyle === "plain"}>Plain paper</button></div></fieldset><label>Letter<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Write it exactly how you mean it..." rows={7} required /></label><label>Closing <span>(optional)</span><input value={signOff} onChange={(event) => setSignOff(event.target.value)} maxLength={100} placeholder="always yours" /></label><label>Attach a picture <span>(optional)</span><input type="file" accept="image/*" capture="environment" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} />{attachment && <small>{attachment.name} attached</small>}</label><div className={`stationery-preview ${theme} ${paperStyle}`} aria-label="Letter style preview"><p>PREVIEW · {theme}</p><strong>{title || "Your letter title"}</strong><span>{note || "Your words will appear here."}</span><em>{signOff || "always yours"}</em></div><button className="submit-letter" type="submit">submit letter</button></form> : <form className="letter-form login-form" onSubmit={signIn}><label>Author password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" required /></label><button className="submit-letter" type="submit">open author desk</button>{loginMessage && <p className="notice" role="status">{loginMessage}</p>}</form>}</section>

    {pendingPhoto && <div className="crop-dialog" role="presentation"><section role="dialog" aria-modal="true" aria-labelledby="crop-title"><button className="crop-close" type="button" onClick={() => setPendingPhoto(null)} aria-label="Cancel image edit">close</button><h2 id="crop-title">Adjust photo</h2><p>Position it inside frame {selectedFrame + 1}, then apply when it looks right.</p><div className={`crop-preview ${boothTemplate}`}><img src={pendingPhoto} alt="Preview of the photo being adjusted" style={{ transform: `translate(${pendingCrop.x * 100}%, ${pendingCrop.y * 100}%) scale(${pendingCrop.zoom})` }}/></div><div className="crop-controls"><label>Zoom<input type="range" min="1" max="2.5" step="0.01" value={pendingCrop.zoom} onChange={(event) => setPendingCrop((crop) => ({ ...crop, zoom: Number(event.target.value) }))}/></label><label>Horizontal position<input type="range" min="-1" max="1" step="0.01" value={pendingCrop.x} onChange={(event) => setPendingCrop((crop) => ({ ...crop, x: Number(event.target.value) }))}/></label><label>Vertical position<input type="range" min="-1" max="1" step="0.01" value={pendingCrop.y} onChange={(event) => setPendingCrop((crop) => ({ ...crop, y: Number(event.target.value) }))}/></label></div><div className="crop-footer"><button type="button" onClick={() => setPendingCrop({ zoom: 1, x: 0, y: 0 })}>reset</button><button type="button" onClick={() => setPendingPhoto(null)}>cancel</button><button className="apply-crop" type="button" onClick={() => { setBoothPhotos((current) => current.map((photo, index) => index === selectedFrame ? pendingPhoto : photo)); setBoothCrops((current) => current.map((crop, index) => index === selectedFrame ? pendingCrop : crop)); setPendingPhoto(null); }}>apply</button></div></section></div>}
    {selectedLetter && <div className="letter-dialog" role="presentation" onMouseDown={() => setSelectedLetter(null)}><article className={`opened-letter ${selectedLetter.theme ?? "apricot"}`} role="dialog" aria-modal="true" aria-labelledby="open-letter-title" onMouseDown={(event) => event.stopPropagation()}><div className="envelope-flap" aria-hidden="true" /><button className="close-letter" type="button" onClick={() => setSelectedLetter(null)} aria-label="Close letter">close</button><div className={`letter-paper ${selectedLetter.paperStyle ?? "lined"}`}><p className="letter-type">{selectedLetter.month} · {selectedLetter.kind === "monthly" ? "Monthsary letter" : "Just because"}</p><h2 id="open-letter-title">{selectedLetter.title}</h2><p className="letter-body">{selectedLetter.body}</p>{selectedLetter.attachmentUrl && <img className="letter-attachment" src={selectedLetter.attachmentUrl} alt="A photo attached to this letter" />}<p className="signature">{selectedLetter.signOff || "always yours"}</p></div></article></div>}

    <footer><p>an archive made for two.</p><a href="#top">back to the beginning</a></footer>
  </main>;
}















