const express = require("express");
const cors = require("cors");

const fetch = (...args) =>
 import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(cors());

const KEY = "b46f879d2a5cac35efde91968dc2d99f";
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

// ================= HELPER =================

async function getAllPages(url, pages = 3) {
 let movies = [];

 for (let i = 1; i <= pages; i++) {
  const r = await fetch(`${url}&page=${i}`);
  const d = await r.json();

  if (d?.results) {
   movies.push(
    ...d.results.map(m => ({
     title: m.title || m.name || "",
     poster: m.poster_path ? IMG + m.poster_path : "",
     overview: m.overview || "",
     rating: m.vote_average || "",
     id: m.id,
     type: m.media_type || (m.title ? "movie" : "tv")
    }))
   );
  }
 }

 return movies.filter(x => x.poster);
}

// ================= BASIC =================

app.get("/trending", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/trending/all/week?api_key=${KEY}`));
});

app.get("/top", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/movie/top_rated?api_key=${KEY}`));
});

// 🔥 MISSING COMEDY
app.get("/comedy", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_genres=35`));
});

// ================= CUSTOM =================

app.get("/bollywood", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_original_language=hi&with_genres=28`));
});

app.get("/inspiring", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_keywords=180547`));
});

app.get("/japanese", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_original_language=ja`));
});

app.get("/indie", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_keywords=10183`));
});

app.get("/books", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_keywords=818`));
});

app.get("/asian", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_original_language=ko`));
});

app.get("/reality", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_genres=10764`));
});

app.get("/adult", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_genres=16`));
});

app.get("/sports", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_genres=99|10770`));
});

app.get("/short", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_genres=10762`));
});

app.get("/violent", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_original_language=hi&with_genres=28`));
});

app.get("/emmy", async(req,res)=>{
 res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&sort_by=vote_average.desc&vote_count.gte=500`));
});

// ================= SEARCH =================

app.get("/search", async(req,res)=>{
 const q=req.query.q||"";
 if(!q) return res.json([]);
 res.json(await getAllPages(`${BASE}/search/multi?api_key=${KEY}&query=${q}`,2));
});

// ================= DETAILS =================

app.get("/details/:title", async(req,res)=>{
 try{
  const s = await fetch(`${BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(req.params.title)}`);
  const sd = await s.json();
  if(!sd?.results?.length) return res.json(null);

  const item = sd.results[0];

  res.json({
   title: item.title || item.name,
   poster: item.poster_path ? IMG + item.poster_path : "",
   overview: item.overview || "",
   rating: item.vote_average || "",
   release: item.release_date || item.first_air_date || "",
   type: item.media_type || "movie"
  });

 }catch{
  res.json(null);
 }
});

app.get("/episodes/:title", async(req,res)=>{
 try{
  const s = await fetch(`${BASE}/search/tv?api_key=${KEY}&query=${encodeURIComponent(req.params.title)}`);
  const sd = await s.json();
  if(!sd.results.length) return res.json([]);

  const id = sd.results[0].id;

  const ep = await fetch(`${BASE}/tv/${id}?api_key=${KEY}`);
  const ed = await ep.json();

  res.json(ed.seasons || []);
 }catch{
  res.json([]);
 }
});

// ================= TRAILER =================

app.get("/trailer/:title", async(req,res)=>{
 try{
  const s = await fetch(`${BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(req.params.title)}`);
  const sd = await s.json();
  if(!sd?.results?.length) return res.json(null);

  const item = sd.results[0];
  const type = item.media_type || "movie";
  const id = item.id;

  const v = await fetch(`${BASE}/${type}/${id}/videos?api_key=${KEY}`);
  const vd = await v.json();
  if(!vd?.results?.length) return res.json(null);

  const vid =
   vd.results.find(x=>x.site==="YouTube" && x.type==="Trailer") ||
   vd.results.find(x=>x.site==="YouTube" && x.type==="Teaser") ||
   vd.results.find(x=>x.site==="YouTube");

  res.json(vid ? vid.key : null);

 }catch{
  res.json(null);
 }
});

// ================= START =================

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>console.log("Backend running "));