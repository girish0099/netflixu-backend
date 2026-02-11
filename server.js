const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET"],
}));

// ================= CONFIG =================

const KEY = "b46f879d2a5cac35efde91968dc2d99f";
const BASE = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";

// ================= SIMPLE CACHE =================

const cache = {};
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

async function fetchWithCache(url) {
  const now = Date.now();

  if (cache[url] && (now - cache[url].time < CACHE_TIME)) {
    return cache[url].data;
  }

  const r = await fetch(url);
  const d = await r.json();

  cache[url] = {
    time: now,
    data: d
  };

  return d;
}

// ================= SAFE FETCH =================

async function getAllPages(url, pages = 1) {
  let movies = [];

  for (let i = 1; i <= pages; i++) {
    await new Promise(r => setTimeout(r, 250));

    const d = await fetchWithCache(`${url}&page=${i}`);

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

// ================= ROUTES =================

app.get("/trending", async (req, res) => {
  res.json(await getAllPages(`${BASE}/trending/all/week?api_key=${KEY}`));
});

app.get("/top", async (req, res) => {
  res.json(await getAllPages(`${BASE}/movie/top_rated?api_key=${KEY}`));
});

app.get("/comedy", async (req, res) => {
  res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_genres=35`));
});

app.get("/bollywood", async (req, res) => {
  res.json(await getAllPages(`${BASE}/discover/movie?api_key=${KEY}&with_original_language=hi`));
});

app.get("/japanese", async (req, res) => {
  res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_original_language=ja`));
});

app.get("/asian", async (req, res) => {
  res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&with_original_language=ko`));
});

app.get("/emmy", async (req, res) => {
  res.json(await getAllPages(`${BASE}/discover/tv?api_key=${KEY}&sort_by=vote_average.desc&vote_count.gte=500`));
});

// ================= NEW CATEGORIES =================

// 📚 Books (Book Adaptations)
app.get("/books", async (req, res) => {
  res.json(
    await getAllPages(
      `${BASE}/discover/movie?api_key=${KEY}&with_keywords=818`
    )
  );
});

// 🎬 Shorts (Short Films)
app.get("/short", async (req, res) => {
  res.json(
    await getAllPages(
      `${BASE}/discover/movie?api_key=${KEY}&with_genres=10755`
    )
  );
});



// 🏆 Sports
app.get("/sports", async (req, res) => {
  res.json(
    await getAllPages(
      `${BASE}/discover/movie?api_key=${KEY}&with_keywords=180547`
    )
  );
});

// 🔥 Violent (Action + Thriller)
app.get("/violent", async (req, res) => {
  res.json(
    await getAllPages(
      `${BASE}/discover/movie?api_key=${KEY}&with_genres=28,53`
    )
  );
});

// 🔞 Adult (Mature Rated – Not Explicit)
app.get("/adult", async (req, res) => {
  res.json(
    await getAllPages(
      `${BASE}/discover/movie?api_key=${KEY}&certification_country=US&certification=R`
    )
  );
});

// 📺 Reality
app.get("/reality", async (req, res) => {
  res.json(
    await getAllPages(
      `${BASE}/discover/tv?api_key=${KEY}&with_genres=10764`
    )
  );
});

// ================= SEARCH =================

app.get("/search", async (req, res) => {
  const q = req.query.q || "";
  if (!q) return res.json([]);

  res.json(await getAllPages(`${BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(q)}`));
});

// ================= DETAILS =================

app.get("/details/:title", async (req, res) => {
  try {
    const s = await fetchWithCache(`${BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(req.params.title)}`);
    if (!s?.results?.length) return res.json(null);

    const item = s.results[0];

    res.json({
      title: item.title || item.name,
      poster: item.poster_path ? IMG + item.poster_path : "",
      overview: item.overview || "",
      rating: item.vote_average || "",
      release: item.release_date || item.first_air_date || "",
      type: item.media_type || "movie"
    });

  } catch {
    res.json(null);
  }
});

// ================= TRAILER =================

app.get("/trailer/:title", async (req, res) => {
  try {
    const s = await fetchWithCache(`${BASE}/search/multi?api_key=${KEY}&query=${encodeURIComponent(req.params.title)}`);
    if (!s?.results?.length) return res.json(null);

    const item = s.results[0];
    const type = item.media_type || "movie";
    const id = item.id;

    const v = await fetchWithCache(`${BASE}/${type}/${id}/videos?api_key=${KEY}`);
    if (!v?.results?.length) return res.json(null);

    const vid =
      v.results.find(x => x.site === "YouTube" && x.type === "Trailer") ||
      v.results.find(x => x.site === "YouTube");

    res.json(vid ? vid.key : null);

  } catch {
    res.json(null);
  }
});

// ================= HEALTH =================

app.get("/", (req, res) => {
  res.send("NetflixU Backend Running 🚀");
});

// 🎌 Anime (TV + Movies)
app.get("/anime", async (req, res) => {

  const tv = await getAllPages(
    `${BASE}/discover/tv?api_key=${KEY}&with_genres=16&with_original_language=ja`
  );

  const movies = await getAllPages(
    `${BASE}/discover/movie?api_key=${KEY}&with_genres=16&with_original_language=ja`
  );

  res.json([...tv, ...movies]);
});

// ================= START =================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
