import express from 'express';
import cors from 'cors';
import { db, getAuthorProfile, saveAuthorProfile, registerAuthorByAdmin, loginUser, getAuthorUserByUsername, listAllAuthors, changeUserPassword, resetAuthorPasswordByAdmin, deleteAuthorByAdmin, updateAuthorPermissionsByAdmin, updateAuthorRoleByAdmin, recordTelemetryEvent, getTelemetryStats, upsertCubixAuthor, fetchCubixTeamData, getServerRules, saveServerRules } from './db';
import { authenticateViaCubixTcp } from './cubixAuth';
import type { Guide, GuideMeta, GuideBlock, AuthorProfile } from '../src/types/guide';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const DEFAULT_CUBIX_SERVERS = [
  "OneBlock", "IceAndFire_1165", "Create_1211", "MagicRPG", "Galaxy", 
  "OneBlock-Mobile", "Pixelmon_1211", "HiTech", "TechnoMagic", 
  "HiTech-Mobile", "Cobblemon_1211", "TechnoMagic-Mobile", "OceanBlock_1165", 
  "Industrial", "GregTech", "Pixelmon_1165", "Pixelmon", 
  "SkyTech"
];

// Helper to format DB row to Guide object
function formatGuideRow(row: any): Guide {
  let coAuthors: string[] = [];
  try {
    if (row.co_authors) {
      coAuthors = JSON.parse(row.co_authors);
    }
  } catch (e) {
    if (typeof row.co_authors === 'string') {
      coAuthors = row.co_authors.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  const published = Boolean(row.published);
  const rawVisible = row.is_visible !== undefined ? Boolean(row.is_visible) : false;
  // По условию: если не опубликован (published === false), то автоматически НЕ виден обычным пользователям
  const isVisible = published ? rawVisible : false;

  return {
    meta: {
      id: row.id,
      title: row.title,
      category: row.category,
      author: row.author,
      coAuthors: coAuthors,
      difficulty: row.difficulty,
      summary: row.summary || '',
      updatedAt: row.updated_at,
      published: published,
      isVisible: isVisible,
      status: row.status || (published ? 'approved' : 'draft'),
      rejectionReason: row.rejection_reason || undefined,
      server: row.server || undefined,
      coverUrl: row.cover_url || undefined,
      coverGradient: row.cover_gradient || undefined
    },
    blocks: JSON.parse(row.blocks || '[]')
  };
}

// REST API Endpoints

// 0. Live CubixWorld Servers Proxy Endpoint
app.get('/api/servers', async (req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch('https://online.cubix.world/api/metrics/server-list', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Cubix metrics API returned status ${response.status}`);
    }

    const data: any = await response.json();
    const serverMap = new Map<string, string>();

    if (Array.isArray(data)) {
      data.forEach((srv: any) => {
        if (srv.name) {
          const cleanName = String(srv.name).trim();
          serverMap.set(cleanName.toLowerCase(), cleanName);
        }
      });
    }

    DEFAULT_CUBIX_SERVERS.forEach(srv => {
      if (!serverMap.has(srv.toLowerCase())) {
        serverMap.set(srv.toLowerCase(), srv);
      }
    });

    const uniqueServers = Array.from(serverMap.values());
    res.json(uniqueServers);
  } catch (err: any) {
    res.json(DEFAULT_CUBIX_SERVERS);
  }
});



// Cached proxy endpoint for CubixWorld avatars with HTTP Cache-Control headers
app.get('/api/avatar/:username', async (req, res) => {
  const username = req.params.username;
  try {
    const avatarUrl = `https://cubixworld.net/api/account.load.avatar?login=${encodeURIComponent(username)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(avatarUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/*, */*'
      }
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'image/png';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days browser caching
      return res.send(buffer);
    }
  } catch (e) {}

  // Fallback to DiceBear if CubixWorld avatar fails
  res.redirect(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`);
});
app.get('/api/team', async (req, res) => {
  try {
    const response = await fetch('https://cubixworld.net/api/team', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.team && Object.keys(data.team).length > 0) {
        return res.json(data);
      }
    }
  } catch (err: any) {
    console.error('Error fetching CubixWorld Team API on backend:', err.message);
  }

  // Full 17 servers fallback dataset from official CubixWorld team snapshot
  res.json({
    "team": {
      "0": { "server_name": "HiTech #1", "server_id": 1, "team": { "0": { "id": 78718, "name": "Eifel", "group_name": "Старший администратор" }, "1": { "id": 76788, "name": "XlebuIIIek_TOP", "group_name": "Старший администратор" }, "2": { "id": 76789, "name": "_Snejock_", "group_name": "Старший администратор" }, "3": { "id": 76819, "name": "Dam_v_Tablo", "group_name": "Администратор" }, "4": { "id": 76845, "name": "DexterXI", "group_name": "Администратор" }, "5": { "id": 96908, "name": "Ramon1999", "group_name": "Администратор" }, "6": { "id": 94332, "name": "bogdan49494949", "group_name": "Младший админ" }, "7": { "id": 93122, "name": "Steyferptsv2", "group_name": "Младший админ" }, "8": { "id": 97612, "name": "CuNuU_KuT", "group_name": "Хелпер" }, "9": { "id": 97636, "name": "Universe77", "group_name": "Хелпер" }, "10": { "id": 96932, "name": "K_isk_A", "group_name": "Строитель" } } },
      "1": { "server_name": "SkyTech #1", "server_id": 3, "team": { "0": { "id": 44643, "name": "Desires", "group_name": "Старший администратор" }, "1": { "id": 97429, "name": "Xallo", "group_name": "Старший администратор" }, "2": { "id": 70609, "name": "vmeste", "group_name": "Старший администратор" }, "3": { "id": 77271, "name": "Dailmaran", "group_name": "Старший администратор" }, "4": { "id": 94480, "name": "Kupysha17", "group_name": "Администратор" }, "5": { "id": 83558, "name": "Agression", "group_name": "Администратор" }, "6": { "id": 90257, "name": "Tweaky", "group_name": "Администратор" } } },
      "2": { "server_name": "TechnoMagic #1", "server_id": 40, "team": { "0": { "id": 76851, "name": "Eifel", "group_name": "Старший администратор" }, "1": { "id": 89669, "name": "Glut1k", "group_name": "Старший администратор" }, "2": { "id": 86637, "name": "_Qusya_", "group_name": "Старший администратор" }, "3": { "id": 80781, "name": "I_Belik222", "group_name": "Старший администратор" }, "4": { "id": 90608, "name": "Kriiz", "group_name": "Старший администратор" }, "5": { "id": 76795, "name": "Desires", "group_name": "Старший администратор" }, "6": { "id": 76807, "name": "MrRoBoTTT", "group_name": "Администратор" }, "7": { "id": 76808, "name": "Oculin", "group_name": "Администратор" }, "8": { "id": 97892, "name": "ginn0", "group_name": "Администратор" }, "9": { "id": 88173, "name": "Svetlana565", "group_name": "Администратор" }, "10": { "id": 87491, "name": "Best4PlayYork", "group_name": "Администратор" }, "11": { "id": 88046, "name": "Assasin_Gelin", "group_name": "Администратор" }, "12": { "id": 88048, "name": "zevon", "group_name": "Администратор" }, "13": { "id": 92953, "name": "drazdraberma", "group_name": "Старший модератор" }, "14": { "id": 97627, "name": "Kirill_Kruglov", "group_name": "Старший модератор" }, "15": { "id": 89085, "name": "sw1sd", "group_name": "Старший модератор" }, "16": { "id": 93447, "name": "CTARUK", "group_name": "Модератор" }, "17": { "id": 94569, "name": "Narutorendan", "group_name": "Модератор" }, "18": { "id": 95354, "name": "Odin1722", "group_name": "Модератор" }, "19": { "id": 94629, "name": "JostSopl", "group_name": "Модератор" }, "20": { "id": 95403, "name": "dedavnutri", "group_name": "Модератор" }, "21": { "id": 97537, "name": "Metolus", "group_name": "Младший модер" }, "22": { "id": 97545, "name": "IvanKarman", "group_name": "Младший модер" }, "23": { "id": 93107, "name": "tuuchaa", "group_name": "Младший модер" }, "24": { "id": 94403, "name": "Galleta", "group_name": "Младший модер" }, "25": { "id": 94695, "name": "ShironLd", "group_name": "Младший модер" }, "26": { "id": 97572, "name": "Oxen", "group_name": "Хелпер" }, "27": { "id": 85578, "name": "De_rider", "group_name": "Строитель" } } },
      "3": { "server_name": "MagicRPG #1", "server_id": 5, "team": { "0": { "id": 79623, "name": "CheeseRat", "group_name": "Старший администратор" }, "1": { "id": 82195, "name": "Eifel", "group_name": "Старший администратор" }, "2": { "id": 88705, "name": "TechnoLogister", "group_name": "Старший администратор" }, "3": { "id": 82323, "name": "anaeus", "group_name": "Старший администратор" }, "4": { "id": 93605, "name": "_Snejock_", "group_name": "Старший администратор" }, "5": { "id": 79828, "name": "Desires", "group_name": "Старший администратор" }, "6": { "id": 82893, "name": "Vinyl_", "group_name": "Администратор" }, "7": { "id": 79605, "name": "Kamishini", "group_name": "Администратор" }, "8": { "id": 92377, "name": "LordOfDragon", "group_name": "Младший админ" } } },
      "4": { "server_name": "Galaxy #1", "server_id": 6, "team": { "0": { "id": 78598, "name": "Dam_v_Tablo", "group_name": "Старший администратор" }, "1": { "id": 46642, "name": "Eifel", "group_name": "Старший администратор" }, "2": { "id": 88885, "name": "Snorwar", "group_name": "Старший администратор" }, "3": { "id": 54595, "name": "Desires", "group_name": "Старший администратор" }, "4": { "id": 78169, "name": "_Snejock_", "group_name": "Старший администратор" }, "5": { "id": 93604, "name": "TechnoLogister", "group_name": "Старший администратор" }, "6": { "id": 93652, "name": "Ramon1999", "group_name": "Администратор" }, "7": { "id": 93409, "name": "owlqueen135", "group_name": "Администратор" }, "8": { "id": 88317, "name": "aviamodel", "group_name": "Администратор" }, "9": { "id": 95433, "name": "EnJay", "group_name": "Хелпер" } } },
      "5": { "server_name": "Industrial #1", "server_id": 7, "team": { "0": { "id": 76823, "name": "vmeste", "group_name": "Старший администратор" }, "1": { "id": 45661, "name": "Desires", "group_name": "Старший администратор" }, "2": { "id": 63100, "name": "Dailmaran", "group_name": "Старший администратор" }, "3": { "id": 97430, "name": "Xallo", "group_name": "Старший администратор" }, "4": { "id": 91481, "name": "Mypp", "group_name": "Администратор" }, "5": { "id": 76419, "name": "Gentlyfast0o1", "group_name": "Администратор" }, "6": { "id": 75198, "name": "SLAVADIMA", "group_name": "Администратор" }, "7": { "id": 97898, "name": "_StellVortex_", "group_name": "Хелпер" }, "8": { "id": 69206, "name": "devilgirl2007", "group_name": "Строитель" }, "9": { "id": 94316, "name": "Aswood", "group_name": "Строитель" } } },
      "6": { "server_name": "GregTech #1", "server_id": 18, "team": { "0": { "id": 63163, "name": "YaZheVika", "group_name": "Старший администратор" }, "1": { "id": 63174, "name": "MaKZ71", "group_name": "Старший администратор" }, "2": { "id": 85555, "name": "Vinyl_", "group_name": "Администратор" }, "3": { "id": 88936, "name": "Vinposetin", "group_name": "Администратор" }, "4": { "id": 63167, "name": "Rikhter", "group_name": "Администратор" }, "5": { "id": 42725, "name": "Lirix", "group_name": "Администратор" }, "6": { "id": 88903, "name": "iceq", "group_name": "Младший админ" }, "7": { "id": 85920, "name": "LiderV", "group_name": "Строитель" } } },
      "7": { "server_name": "OneBlock #1", "server_id": 21, "team": { "0": { "id": 88414, "name": "Vinyl_", "group_name": "Старший администратор" }, "1": { "id": 80528, "name": "twiinks_uwu", "group_name": "Старший администратор" }, "2": { "id": 84718, "name": "Desires", "group_name": "Старший администратор" }, "3": { "id": 96067, "name": "SuzuaJuzo", "group_name": "Администратор" }, "4": { "id": 84572, "name": "OG_Dimka", "group_name": "Администратор" }, "5": { "id": 91016, "name": "__Hopper__", "group_name": "Администратор" }, "6": { "id": 94694, "name": "stampedes", "group_name": "Администратор" }, "7": { "id": 98043, "name": "Best4PlayYork", "group_name": "Администратор" }, "8": { "id": 97546, "name": "SanZah", "group_name": "Младший админ" }, "9": { "id": 86130, "name": "4RAJ", "group_name": "Младший админ" }, "10": { "id": 97031, "name": "OG_Sashka", "group_name": "Старший модератор" }, "11": { "id": 97602, "name": "scoutdrago3", "group_name": "Младший модер" }, "12": { "id": 97625, "name": "WolaNnn", "group_name": "Младший модер" }, "13": { "id": 97524, "name": "VitaVitaMin", "group_name": "Младший модер" }, "14": { "id": 97244, "name": "maks_ta6it", "group_name": "Хелпер" }, "15": { "id": 97275, "name": "Knigo", "group_name": "Хелпер" } } },
      "8": { "server_name": "Pixelmon 1.16.5 #1", "server_id": 36, "team": { "0": { "id": 77075, "name": "Desires", "group_name": "Старший администратор" }, "1": { "id": 97305, "name": "Bet", "group_name": "Старший администратор" }, "2": { "id": 96570, "name": "_fufa_", "group_name": "Старший администратор" }, "3": { "id": 83967, "name": "jojik23", "group_name": "Старший администратор" }, "4": { "id": 97164, "name": "Keksorino", "group_name": "Администратор" }, "5": { "id": 96697, "name": "Vantyzavr", "group_name": "Старший модератор" }, "6": { "id": 97306, "name": "Eifel", "group_name": "Модератор" }, "7": { "id": 96174, "name": "Xaku", "group_name": "Модератор" }, "8": { "id": 98095, "name": "shadooooew", "group_name": "Хелпер" }, "9": { "id": 97654, "name": "RishaBlin", "group_name": "Хелпер" }, "10": { "id": 97995, "name": "amirka_xxl", "group_name": "Хелпер" }, "11": { "id": 97996, "name": "hennesay", "group_name": "Хелпер" }, "12": { "id": 98009, "name": "Leirus", "group_name": "Хелпер" }, "13": { "id": 98010, "name": "Tenma1w", "group_name": "Хелпер" }, "14": { "id": 98065, "name": "Rim_Chin", "group_name": "Строитель" }, "15": { "id": 97820, "name": "darsi3luv", "group_name": "Строитель" }, "16": { "id": 97821, "name": "Elizabethxxxxx", "group_name": "Строитель" }, "17": { "id": 97569, "name": "Kirill_Kruglov", "group_name": "Строитель" }, "18": { "id": 97375, "name": "Marquis666", "group_name": "Строитель" }, "19": { "id": 97653, "name": "plodojorka", "group_name": "Строитель" }, "20": { "id": 76448, "name": "Sunam0r", "group_name": "Строитель" } } },
      "9": { "server_name": "IceAndFire #1", "server_id": 41, "team": { "0": { "id": 79909, "name": "Dragoner", "group_name": "Старший администратор" }, "1": { "id": 97418, "name": "BrowniX567", "group_name": "Старший администратор" }, "2": { "id": 94491, "name": "Magnat373", "group_name": "Администратор" }, "3": { "id": 79912, "name": "IIIPeGasIII", "group_name": "Администратор" }, "4": { "id": 97328, "name": "Banan4ikPONI", "group_name": "Администратор" }, "5": { "id": 97330, "name": "dknkt", "group_name": "Администратор" }, "6": { "id": 94532, "name": "_Snejock_", "group_name": "Администратор" }, "7": { "id": 95578, "name": "soraokobamu", "group_name": "Администратор" }, "8": { "id": 93022, "name": "Lunaria", "group_name": "Администратор" }, "9": { "id": 89490, "name": "_Sirin_", "group_name": "Администратор" }, "10": { "id": 95187, "name": "kobra44", "group_name": "Администратор" }, "11": { "id": 97510, "name": "lol_on_killer", "group_name": "Администратор" }, "12": { "id": 94492, "name": "pasha2024", "group_name": "Старший модератор" }, "13": { "id": 96894, "name": "lpen", "group_name": "Модератор" }, "14": { "id": 97574, "name": "MDefe", "group_name": "Младший модер" }, "15": { "id": 97628, "name": "Capsloi", "group_name": "Младший модер" }, "16": { "id": 97714, "name": "d0m1n0shka", "group_name": "Строитель" } } },
      "10": { "server_name": "OceanBlock #1", "server_id": 42, "team": { "0": { "id": 90129, "name": "jojik23", "group_name": "Старший администратор" }, "1": { "id": 94263, "name": "Kozinakovich", "group_name": "Старший администратор" }, "2": { "id": 90158, "name": "Pashketik", "group_name": "Администратор" }, "3": { "id": 92925, "name": "GALKINLOL", "group_name": "Администратор" }, "4": { "id": 98105, "name": "_ZiGmOn_", "group_name": "Хелпер" }, "5": { "id": 98004, "name": "Krak0daeL", "group_name": "Хелпер" }, "6": { "id": 98006, "name": "leonhl", "group_name": "Хелпер" }, "7": { "id": 98027, "name": "AKEkPPFB", "group_name": "Строитель" } } },
      "11": { "server_name": "Cobblemon #1", "server_id": 43, "team": { "0": { "id": 88732, "name": "jojik23", "group_name": "Старший администратор" }, "1": { "id": 88733, "name": "Bet", "group_name": "Старший администратор" }, "2": { "id": 91377, "name": "GALKINLOL", "group_name": "Старший администратор" }, "3": { "id": 97590, "name": "Archick", "group_name": "Администратор" }, "4": { "id": 88967, "name": "AllEyesOnMe", "group_name": "Администратор" }, "5": { "id": 94621, "name": "DanushaCeksu", "group_name": "Администратор" }, "6": { "id": 94688, "name": "TimCixo", "group_name": "Администратор" }, "7": { "id": 92656, "name": "Urkosta", "group_name": "Младший админ" }, "8": { "id": 94536, "name": "6_BlackHoll_9", "group_name": "Старший модератор" }, "9": { "id": 96255, "name": "Aom1neDaiki", "group_name": "Модератор" } } },
      "12": { "server_name": "Create #1", "server_id": 44, "team": { "0": { "id": 95099, "name": "jojik23", "group_name": "Старший администратор" }, "1": { "id": 93645, "name": "Bet", "group_name": "Старший администратор" }, "2": { "id": 95712, "name": "Kazuhay", "group_name": "Старший администратор" }, "3": { "id": 93757, "name": "miwinka", "group_name": "Администратор" }, "4": { "id": 98058, "name": "_Sirin_", "group_name": "Строитель" }, "5": { "id": 96653, "name": "Polina9591", "group_name": "Строитель" } } },
      "13": { "server_name": "Pixelmon 1.21.1 #1", "server_id": 45, "team": { "0": { "id": 96340, "name": "Bet", "group_name": "Старший администратор" }, "1": { "id": 96341, "name": "jojik23", "group_name": "Старший администратор" }, "2": { "id": 96516, "name": "RaSaEl_", "group_name": "Администратор" }, "3": { "id": 96342, "name": "Yarognev", "group_name": "Администратор" }, "4": { "id": 96515, "name": "masster416", "group_name": "Младший админ" }, "5": { "id": 97699, "name": "Rockwel", "group_name": "Младший админ" }, "6": { "id": 96514, "name": "vivivat", "group_name": "Старший модератор" }, "7": { "id": 96517, "name": "Nekruz2121", "group_name": "Модератор" }, "8": { "id": 97149, "name": "Fotonyash", "group_name": "Хелпер" } } },
      "14": { "server_name": "HiTech-Mobile #1", "server_id": 100, "team": { "0": { "id": 63238, "name": "_Snejock_", "group_name": "Старший администратор" }, "1": { "id": 54811, "name": "XlebuIIIek_TOP", "group_name": "Старший администратор" }, "2": { "id": 54878, "name": "Eifel", "group_name": "Старший администратор" }, "3": { "id": 57995, "name": "Desires", "group_name": "Старший администратор" }, "4": { "id": 76143, "name": "DexterXI", "group_name": "Администратор" }, "5": { "id": 96909, "name": "Ramon1999", "group_name": "Администратор" }, "6": { "id": 95825, "name": "Raivo", "group_name": "Младший админ" }, "7": { "id": 96968, "name": "Dvjvjdsbsb", "group_name": "Младший модер" } } },
      "15": { "server_name": "TechnoMagic-Mobile #1", "server_id": 101, "team": { "0": { "id": 76852, "name": "Eifel", "group_name": "Старший администратор" }, "1": { "id": 80196, "name": "Kriiz", "group_name": "Старший администратор" }, "2": { "id": 89670, "name": "Glut1k", "group_name": "Старший администратор" }, "3": { "id": 86638, "name": "_Qusya_", "group_name": "Старший администратор" }, "4": { "id": 88194, "name": "I_Belik222", "group_name": "Старший администратор" }, "5": { "id": 94498, "name": "zevon", "group_name": "Администратор" }, "6": { "id": 73008, "name": "ginn0", "group_name": "Администратор" }, "7": { "id": 97893, "name": "Svetlana565", "group_name": "Администратор" }, "8": { "id": 97894, "name": "Best4PlayYork", "group_name": "Администратор" }, "9": { "id": 83055, "name": "MrRoBoTTT", "group_name": "Администратор" }, "10": { "id": 88047, "name": "Assasin_Gelin", "group_name": "Администратор" }, "11": { "id": 81649, "name": "Oculin", "group_name": "Администратор" }, "12": { "id": 89161, "name": "Vadimvolk19", "group_name": "Младший админ" } } },
      "16": { "server_name": "OneBlock-Mobile #1", "server_id": 105, "team": { "0": { "id": 69556, "name": "Vinyl_", "group_name": "Старший администратор" }, "1": { "id": 89809, "name": "twiinks_uwu", "group_name": "Старший администратор" }, "2": { "id": 93499, "name": "OG_Dimka", "group_name": "Администратор" }, "3": { "id": 96066, "name": "SuzuaJuzo", "group_name": "Администратор" }, "4": { "id": 94814, "name": "stampedes", "group_name": "Администратор" }, "5": { "id": 97961, "name": "__Hopper__", "group_name": "Администратор" }, "6": { "id": 96374, "name": "coteso", "group_name": "Старший модератор" }, "7": { "id": 97336, "name": "ToedTripod1582", "group_name": "Младший модер" } } }
    },
    "type": "success"
  });
});

// AUTHENTICATION ENDPOINTS

// Login Author (Local SQLite)
app.post('/api/auth/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Заполните никнейм и пароль' });
    }
    const user = loginUser(username, password);
    res.json(user);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
});

// Verify & Refresh Auth Session
app.get('/api/auth/me', (req, res) => {
  try {
    const username = req.query.username as string;
    if (!username) {
      return res.status(400).json({ error: 'Имя пользователя не указано' });
    }
    const user = getAuthorUserByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// CubixWorld Native TCP Authentication Endpoint
app.post('/api/auth/cubix-login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Укажите никнейм и пароль CubixWorld' });
    }

    const authResult = await authenticateViaCubixTcp(username, password);
    if (!authResult.success) {
      return res.status(401).json({ error: authResult.error || 'Неверный никнейм или пароль CubixWorld' });
    }

    // User authenticated successfully via CubixWorld TCP -> Upsert author profile with accountInfo
    const authorUser = upsertCubixAuthor(authResult.username || username, authResult.accountInfo);
    res.json(authorUser);
  } catch (err: any) {
    res.status(500).json({ error: `Ошибка авторизации CubixWorld: ${err.message}` });
  }
});

// Author Self-Service Password Change Endpoint
app.post('/api/auth/change-password', (req, res) => {
  try {
    const { username, oldPassword, newPassword } = req.body;
    if (!username || !oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Укажите никнейм, текущий пароль и новый пароль' });
    }
    const result = changeUserPassword(username, oldPassword, newPassword);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN-ONLY AUTHOR & PERMISSIONS MANAGEMENT ENDPOINTS

// Register New Author (Only Admin can do this manually)
app.post('/api/admin/register-author', (req, res) => {
  try {
    const { username, password, adminUsername } = req.body;
    if (!username || !password || !adminUsername) {
      return res.status(400).json({ error: 'Укажите никнейм автора, пароль и аккаунт админа' });
    }
    const result = registerAuthorByAdmin(username, password, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update Author Role & Granular Permissions & Assigned Servers (Admin)
app.post('/api/admin/roles', (req, res) => {
  try {
    const { targetUsername, role, customPermissions, assignedServers, adminUsername } = req.body;
    if (!targetUsername || !adminUsername || !role) {
      return res.status(400).json({ error: 'Не указаны целевой автор, роль или админ' });
    }
    const result = updateAuthorRoleByAdmin(targetUsername, role, customPermissions, assignedServers, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Update Author Permissions & Verification (Admin)
app.post('/api/admin/update-permissions', (req, res) => {
  try {
    const { targetUsername, canEditOthers, canCreateGuides, isVerified, adminUsername } = req.body;
    if (!targetUsername || !adminUsername) {
      return res.status(400).json({ error: 'Не указан целевой автор или админ' });
    }
    const result = updateAuthorPermissionsByAdmin(targetUsername, canEditOthers, canCreateGuides, isVerified, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Reset Author Password (Admin)
app.post('/api/admin/reset-password', (req, res) => {
  try {
    const { targetUsername, newPassword, adminUsername } = req.body;
    if (!targetUsername || !newPassword || !adminUsername) {
      return res.status(400).json({ error: 'Укажите никнейм автора и новый пароль' });
    }
    const result = resetAuthorPasswordByAdmin(targetUsername, newPassword, adminUsername);
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// Delete Author Account (Admin)
app.delete('/api/admin/authors/:username', (req, res) => {
  try {
    const { adminUsername } = req.query;
    if (!adminUsername) {
      return res.status(400).json({ error: 'Не указан админ' });
    }
    const result = deleteAuthorByAdmin(req.params.username, String(adminUsername));
    res.json(result);
  } catch (err: any) {
    res.status(403).json({ error: err.message });
  }
});

// List All Authors (Admin)
app.get('/api/admin/authors', (req, res) => {
  try {
    const authors = listAllAuthors();
    res.json(authors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AUTHOR PROFILES API

// Get Author Profile (including verification flag)
app.get('/api/profiles/:username', (req, res) => {
  try {
    const userRow = db.prepare('SELECT is_verified FROM users WHERE LOWER(username) = LOWER(?)').get(req.params.username) as any;
    if (!userRow) {
      return res.status(404).json({ error: 'Автор не зарегистрирован' });
    }
    const isVerified = Boolean(userRow.is_verified);
    const profile = getAuthorProfile(req.params.username);
    res.json({ ...profile, isVerified });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create / Save Author Profile
app.post('/api/profiles/:username', (req, res) => {
  try {
    const profileData: AuthorProfile = req.body;
    if (!profileData || !profileData.username) {
      return res.status(400).json({ error: 'Неверные данные профиля' });
    }
    const saved = saveAuthorProfile({
      ...profileData,
      username: req.params.username
    });
    const userRow = db.prepare('SELECT is_verified FROM users WHERE LOWER(username) = LOWER(?)').get(req.params.username) as any;
    const isVerified = userRow ? Boolean(userRow.is_verified) : (req.params.username.toLowerCase() === 'darkimusss');
    res.json({ ...saved, isVerified });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Get all guides
app.get('/api/guides', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM guides ORDER BY updated_at DESC').all();
    const guides = rows.map(formatGuideRow);
    res.json(guides);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get single guide by ID
app.get('/api/guides/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM guides WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Гайд не найден' });
    }
    const formatted = formatGuideRow(row);
    recordTelemetryEvent('guide_view', {
      guideId: formatted.meta.id,
      guideTitle: formatted.meta.title,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });
    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Telemetry API Endpoints (For Admin Stats & Client Track)
app.post('/api/telemetry/track', (req, res) => {
  try {
    const { eventType, guideId, guideTitle, username, extraData, durationSeconds } = req.body;
    if (eventType) {
      recordTelemetryEvent(eventType, {
        guideId,
        guideTitle,
        username,
        ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
        userAgent: req.headers['user-agent'],
        extraData: extraData ? String(extraData) : undefined,
        durationSeconds: typeof durationSeconds === 'number' ? durationSeconds : undefined
      });
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/telemetry/stats', (req, res) => {
  try {
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);
    if (requestingUser) {
      const userRow = db.prepare('SELECT is_admin FROM users WHERE LOWER(username) = LOWER(?)').get(requestingUser) as any;
      if (!userRow || !userRow.is_admin) {
        return res.status(403).json({ error: 'Доступ разрешен только Администрации' });
      }
    }
    const stats = getTelemetryStats();
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 3. Create new guide
app.post('/api/guides', (req, res) => {
  try {
    const guide: Guide = req.body;
    if (!guide || !guide.meta || !guide.meta.id) {
      return res.status(400).json({ error: 'Неверные данные гайда' });
    }

    const requestingUser = (req.headers['x-author-username'] as string) || guide.meta.author;
    recordTelemetryEvent(guide.meta.published ? 'guide_publish' : 'guide_create', {
      guideId: guide.meta.id,
      guideTitle: guide.meta.title,
      username: requestingUser,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });

    const isPublished = Boolean(guide.meta.published);
    const isVisible = isPublished ? Boolean(guide.meta.isVisible) : false;
    const guideStatus = guide.meta.status || (isPublished ? 'approved' : 'draft');
    const rejectionReason = guide.meta.rejectionReason || null;

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO guides (id, title, category, author, co_authors, difficulty, summary, updated_at, published, is_visible, status, rejection_reason, server, cover_url, cover_gradient, blocks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      guide.meta.id,
      guide.meta.title || '',
      guide.meta.category,
      guide.meta.author,
      JSON.stringify(guide.meta.coAuthors || []),
      guide.meta.difficulty,
      guide.meta.summary || '',
      guide.meta.updatedAt,
      isPublished ? 1 : 0,
      isVisible ? 1 : 0,
      guideStatus,
      rejectionReason,
      guide.meta.server || null,
      guide.meta.coverUrl || null,
      guide.meta.coverGradient || null,
      JSON.stringify(guide.blocks || [])
    );

    res.json(guide);
  } catch (err: any) {
    console.error('API /api/guides POST Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper to check author permission on guide modification
function canUserModifyGuide(requestingUsername: string | undefined, guideId: string): boolean {
  if (!requestingUsername) return true; // If unspecified in dev mode, allow; if present, check strictly
  const userRow = db.prepare('SELECT is_admin, can_edit_others, role, custom_permissions FROM users WHERE LOWER(username) = LOWER(?)').get(requestingUsername) as any;
  if (!userRow) return false;

  const role = userRow.role || (userRow.is_admin ? 'super_admin' : 'author');
  if (role === 'super_admin' || userRow.is_admin || userRow.can_edit_others) return true;

  let customPerms: string[] = [];
  try {
    if (userRow.custom_permissions) customPerms = JSON.parse(userRow.custom_permissions);
  } catch (e) {}

  if (customPerms.includes('edit_other_guide')) return true;

  const existingGuide = db.prepare('SELECT author, co_authors FROM guides WHERE id = ?').get(guideId) as any;
  if (!existingGuide) return true;

  const isOwner = existingGuide.author.toLowerCase() === requestingUsername.toLowerCase();
  if (isOwner) return true;

  let isCoAuthor = false;
  try {
    const coAuthors: string[] = JSON.parse(existingGuide.co_authors || '[]');
    isCoAuthor = coAuthors.some((ca: string) => ca.toLowerCase() === requestingUsername.toLowerCase());
  } catch (e) {}

  return isCoAuthor;
}

// 4. Update existing guide
app.put('/api/guides/:id', (req, res) => {
  try {
    const guideId = req.params.id;
    const guide: Guide = req.body;
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);

    if (requestingUser && !canUserModifyGuide(requestingUser, guideId)) {
      return res.status(403).json({ error: 'У вас нет прав для редактирования чужого гайда' });
    }

    recordTelemetryEvent('guide_edit', {
      guideId: guideId,
      guideTitle: guide?.meta?.title,
      username: requestingUser,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });

    const existingRow = db.prepare('SELECT * FROM guides WHERE id = ?').get(guideId);
    
    const isPublished = Boolean(guide.meta.published);
    const isVisible = isPublished ? Boolean(guide.meta.isVisible) : false;
    const guideStatus = guide.meta.status || (isPublished ? 'approved' : 'draft');
    const rejectionReason = guide.meta.rejectionReason || null;

    if (!existingRow) {
      const stmt = db.prepare(`
        INSERT INTO guides (id, title, category, author, co_authors, difficulty, summary, updated_at, published, is_visible, status, rejection_reason, server, cover_url, cover_gradient, blocks)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        guideId,
        guide.meta.title || '',
        guide.meta.category,
        guide.meta.author,
        JSON.stringify(guide.meta.coAuthors || []),
        guide.meta.difficulty,
        guide.meta.summary || '',
        guide.meta.updatedAt,
        isPublished ? 1 : 0,
        isVisible ? 1 : 0,
        guideStatus,
        rejectionReason,
        guide.meta.server || null,
        guide.meta.coverUrl || null,
        guide.meta.coverGradient || null,
        JSON.stringify(guide.blocks || [])
      );
    } else {
      const stmt = db.prepare(`
        UPDATE guides
        SET title = ?, category = ?, author = ?, co_authors = ?, difficulty = ?, summary = ?, updated_at = ?, published = ?, is_visible = ?, status = ?, rejection_reason = ?, server = ?, cover_url = ?, cover_gradient = ?, blocks = ?
        WHERE id = ?
      `);
      stmt.run(
        guide.meta.title || '',
        guide.meta.category,
        guide.meta.author,
        JSON.stringify(guide.meta.coAuthors || []),
        guide.meta.difficulty,
        guide.meta.summary || '',
        guide.meta.updatedAt,
        isPublished ? 1 : 0,
        isVisible ? 1 : 0,
        guideStatus,
        rejectionReason,
        guide.meta.server || null,
        guide.meta.coverUrl || null,
        guide.meta.coverGradient || null,
        JSON.stringify(guide.blocks || []),
        guideId
      );
    }

    res.json(guide);
  } catch (err: any) {
    console.error('API /api/guides PUT Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Delete guide
app.delete('/api/guides/:id', (req, res) => {
  try {
    const guideId = req.params.id;
    const requestingUser = (req.headers['x-author-username'] as string) || (req.query.requestingUsername as string);

    if (requestingUser && !canUserModifyGuide(requestingUser, guideId)) {
      return res.status(403).json({ error: 'У вас нет прав для удаления чужого гайда' });
    }

    recordTelemetryEvent('guide_delete', {
      guideId: guideId,
      username: requestingUser,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
      userAgent: req.headers['user-agent']
    });

    const stmt = db.prepare('DELETE FROM guides WHERE id = ?');
    const result = stmt.run(guideId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Гайд не найден' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// Server rules API Endpoints
app.get('/api/server-rules/:serverId', (req, res) => {
  try {
    const { serverId } = req.params;
    const rules = getServerRules(serverId);
    if (!rules) {
      return res.status(404).json({ error: 'Правила для данного сервера не найдены' });
    }
    res.json(rules);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/server-rules', (req, res) => {
  try {
    const rulesData = req.body;
    if (!rulesData || !rulesData.server_id || !rulesData.server_name) {
      return res.status(400).json({ error: 'Обязательные поля: server_id, server_name' });
    }
    const saved = saveServerRules(rulesData);
    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[SQLite Server] Server running on http://localhost:${PORT}`);
});
