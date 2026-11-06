
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  PermissionsBitField
} = require("discord.js");

const { createCanvas } = require("@napi-rs/canvas");
const fs = require("fs");

const TOKEN = process.env.TOKEN;
const COLOR = 0xFFFFFF;
const DB_FILE = "./main-data.json";

if (!TOKEN) {
  console.error("❌ TOKEN غير موجود في متغيرات الاستضافة");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// ==========================================
// DATABASE
// ==========================================

const defaultNames = {
  games: "الألعاب",
  fastest: "الأسرع",
  mafia: "مافيا",
  scramble: "تفكيك الكلمات",
  xo: "XO",
  rps: "حجر ورقة مقص",
  guess: "خمن الرقم",
  quiz: "أسئلة وأجوبة"
};

let db = {
  names: { ...defaultNames },
  players: {}
};

if (fs.existsSync(DB_FILE)) {
  try {
    const old = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db = {
      names: { ...defaultNames, ...(old.names || {}) },
      players: old.players || {}
    };
  } catch (e) {
    console.log("تعذر تحميل البيانات القديمة");
  }
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function getPlayer(id) {
  if (!db.players[id]) {
    db.players[id] = { points: 0, wins: 0 };
  }
  return db.players[id];
}

function reward(id, points = 10) {
  const p = getPlayer(id);
  p.points += points;
  p.wins++;
  save();
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function makeEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "MAIN GAMES" })
    .setTimestamp();
}

// ==========================================
// IMAGE GENERATOR
// ==========================================

function makeImage(title, subtitle, emoji = "🎮") {
  const canvas = createCanvas(1000, 500);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1000, 500);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#374151");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1000, 500);

  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.beginPath();
  ctx.arc(800, 100, 230, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(150, 450, 200, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 940, 440);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "100px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(emoji, 500, 155);

  ctx.font = "bold 65px Arial";
  ctx.fillText(title, 500, 300);

  ctx.font = "30px Arial";
  ctx.fillStyle = "#D1D5DB";
  ctx.fillText(subtitle, 500, 385);

  ctx.font = "bold 24px Arial";
  ctx.fillStyle = "#9CA3AF";
  ctx.fillText("MAIN GAMES", 500, 435);

  return canvas.toBuffer("image/png");
}

function makeWordImage(word) {
  const canvas = createCanvas(1000, 500);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1000, 500);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#4B5563");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1000, 500);

  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 940, 440);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#D1D5DB";
  ctx.font = "bold 45px Arial";
  ctx.fillText("MAIN | SPEED CHALLENGE", 500, 105);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 100px Arial";
  ctx.fillText(word, 500, 270);

  ctx.font = "30px Arial";
  ctx.fillStyle = "#D1D5DB";
  ctx.fillText("اكتب الكلمة بأسرع وقت!", 500, 390);

  return canvas.toBuffer("image/png");
}

async function sendGameImage(channel, key, description, emoji) {
  const title = db.names[key] || key;
  const buffer = makeImage(title, description, emoji);

  const attachment = new AttachmentBuilder(buffer, {
    name: `${key}.png`
  });

  const e = makeEmbed(title, description)
    .setImage(`attachment://${key}.png`);

  return channel.send({
    embeds: [e],
    files: [attachment]
  });
}

// ==========================================
// GAME DATA
// ==========================================

const words = [
  "مدرسة",
  "كمبيوتر",
  "سيارة",
  "ديسكورد",
  "برمجة",
  "مستشفى",
  "مكتبة",
  "طائرة",
  "هاتف",
  "مغامرة",
  "صداقة",
  "بطولة",
  "قمر",
  "نجمة",
  "بحر",
  "قهوة",
  "كتاب",
  "مفتاح",
  "سحابة",
  "حديقة"
];

const questions = [
  { q: "ما عاصمة السعودية؟", a: "الرياض" },
  { q: "كم عدد أيام الأسبوع؟", a: "7" },
  { q: "ما أكبر كوكب؟", a: "المشتري" },
  { q: "ما الحيوان المعروف بسفينة الصحراء؟", a: "الجمل" },
  { q: "كم عدد حروف اللغة العربية؟", a: "28" },
  { q: "ما عاصمة اليابان؟", a: "طوكيو" },
  { q: "ما الكوكب الأحمر؟", a: "المريخ" },
  { q: "كم يساوي 9 × 9؟", a: "81" },
  { q: "ما أسرع حيوان بري؟", a: "الفهد" }
];

const activeGames = new Map();
const mafiaGames = new Map();

function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffleWord(word) {
  const chars = word.split("");
  let shuffled = word;

  while (shuffled === word) {
    shuffled = [...chars]
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  return shuffled;
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s/g, "")
    .trim();
}

// ==========================================
// GAMES MENU
// ==========================================

function gamesMenu() {
  const select = new StringSelectMenuBuilder()
    .setCustomId("main_select_game")
    .setPlaceholder("🎮 اختر اللعبة")
    .addOptions(
      Object.entries(db.names)
        .filter(([id]) => id !== "games")
        .map(([id, name]) => ({
          label: name.slice(0, 100),
          value: id,
          description: `ابدأ لعبة ${name}`.slice(0, 100)
        }))
    );

  return new ActionRowBuilder().addComponents(select);
}

async function showGames(message) {
  const entries = Object.entries(db.names)
    .filter(([id]) => id !== "games");

  const description = entries.map(([id, name]) => {
    const icons = {
      fastest: "⚡",
      mafia: "🕵️",
      scramble: "🔤",
      xo: "❌",
      rps: "✂️",
      guess: "🎯",
      quiz: "❓"
    };

    return `${icons[id] || "🎮"} **${name}**`;
  }).join("\n");

  const attachment = new AttachmentBuilder(
    makeImage("MAIN GAMES", "اختر لعبتك وابدأ التحدي", "🎮"),
    { name: "main-games.png" }
  );

  const e = makeEmbed(
    "🎮 MAIN GAMES",
    `مرحباً بك في ألعاب MAIN!\n\n${description}\n\nاختر اللعبة من القائمة بالأسفل.`
  ).setImage("attachment://main-games.png");

  return message.reply({
    embeds: [e],
    files: [attachment],
    components: [gamesMenu()]
  });
}

// ==========================================
// FASTEST GAME
// ==========================================

async function startFastest(message) {
  const id = `fastest_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("⚠️ يوجد تحدي أسرع شغال بالفعل!");
  }

  const word = randomItem(words);

  const attachment = new AttachmentBuilder(
    makeWordImage(word),
    { name: "speed-word.png" }
  );

  const game = {
    type: "fastest",
    answer: normalize(word),
    channel: message.channel,
    message: null
  };

  activeGames.set(id, game);

  const e = makeEmbed(
    "⚡ " + db.names.fastest,
    "اكتب الكلمة الموجودة في الصورة بأسرع وقت!\n\n⏱️ مدة التحدي: **15 ثانية**\n🏆 أول إجابة صحيحة تفوز بـ **15 نقطة**."
  ).setImage("attachment://speed-word.png");

  const sent = await message.channel.send({
    embeds: [e],
    files: [attachment]
  });

  game.message = sent;

  setTimeout(async () => {
    if (!activeGames.has(id)) return;

    activeGames.delete(id);

    await message.channel.send({
      embeds: [
        makeEmbed(
          "⏰ انتهى تحدي الأسرع",
          "انتهى الوقت ولم يتمكن أحد من الفوز!"
        )
      ]
    });
  }, 15000);
}

// ==========================================
// SCRAMBLE GAME
// ==========================================

async function startScramble(message) {
  const id = `scramble_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("يوجد تحدي شغال بالفعل.");
  }

  const word = randomItem(words);
  const mixed = shuffleWord(word);

  const attachment = new AttachmentBuilder(
    makeWordImage(mixed.split("").join(" | ")),
    { name: "scramble.png" }
  );

  activeGames.set(id, {
    type: "scramble",
    answer: normalize(word)
  });

  const e = makeEmbed(
    db.names.scramble,
    "رتب الحروف الموجودة في الصورة واكتشف الكلمة!\n\n🏆 أول إجابة صحيحة تفوز بـ 15 نقطة.\n⏱️ المدة: 45 ثانية."
  ).setImage("attachment://scramble.png");

  await message.channel.send({
    embeds: [e],
    files: [attachment]
  });

  setTimeout(() => {
    if (!activeGames.has(id)) return;
    activeGames.delete(id);
    message.channel.send("⏰ انتهى التحدي!");
  }, 45000);
}

// ==========================================
// GUESS NUMBER
// ==========================================

async function startGuess(message) {
  const id = `guess_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("هناك لعبة تخمين شغالة بالفعل.");
  }

  const number = Math.floor(Math.random() * 10) + 1;

  activeGames.set(id, {
    type: "guess",
    answer: String(number)
  });

  await sendGameImage(
    message.channel,
    "guess",
    "خمن الرقم من 1 إلى 10!\nأول شخص يكتب الرقم الصحيح يفوز بـ 10 نقاط.",
    "🎯"
  );

  setTimeout(() => {
    if (!activeGames.has(id)) return;
    activeGames.delete(id);
    message.channel.send("⏰ انتهت اللعبة!");
  }, 30000);
}

// ==========================================
// QUIZ
// ==========================================

async function startQuiz(message) {
  const id = `quiz_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("هناك سؤال شغال بالفعل.");
  }

  const q = randomItem(questions);

  activeGames.set(id, {
    type: "quiz",
    answer: normalize(q.a)
  });

  await sendGameImage(
    message.channel,
    "quiz",
    `❓ ${q.q}\n\nأول إجابة صحيحة تفوز بـ 10 نقاط.\n⏱️ المدة: 30 ثانية.`,
    "❓"
  );

  setTimeout(() => {
    if (!activeGames.has(id)) return;
    activeGames.delete(id);
    message.channel.send(`انتهى السؤال! الإجابة: **${q.a}**`);
  }, 30000);
}

// ==========================================
// XO
// ==========================================

function xoRows(game) {
  const rows = [];

  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();

    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`xo:${game.channelId}:${i}`)
          .setLabel(game.board[i] || "・")
          .setStyle(
            game.board[i] === "❌"
              ? ButtonStyle.Danger
              : game.board[i] === "⭕"
                ? ButtonStyle.Primary
                : ButtonStyle.Secondary
          )
          .setDisabled(
            Boolean(game.board[i]) || game.finished || game.players.length < 2
          )
      );
    }

    rows.push(row);
  }

  if (game.players.length === 1 && !game.finished) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`xojoin:${game.channelId}`)
          .setLabel("انضم للمباراة")
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  return rows;
}

function xoWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const line of lines) {
    if (
      board[line[0]] &&
      board[line[0]] === board[line[1]] &&
      board[line[1]] === board[line[2]]
    ) {
      return board[line[0]];
    }
  }

  return null;
}

async function startXO(message) {
  const id = message.channel.id;

  if (activeGames.has(`xo_${id}`)) {
    return message.reply("هناك مباراة XO شغالة.");
  }

  const game = {
    channelId: id,
    players: [message.author.id],
    board: Array(9).fill(null),
    turn: 0,
    finished: false,
    marks: ["❌", "⭕"]
  };

  activeGames.set(`xo_${id}`, game);

  const attachment = new AttachmentBuilder(
    makeImage(db.names.xo, "تحدي بين لاعبين", "❌"),
    { name: "xo.png" }
  );

  const sent = await message.reply({
    embeds: [
      makeEmbed(
        db.names.xo,
        `اللاعب الأول: ${message.author}\n\nينتظر لاعباً آخر للانضمام.`
      ).setImage("attachment://xo.png")
    ],
    files: [attachment],
    components: xoRows(game)
  });

  game.messageId = sent.id;
}

// ==========================================
// ROCK PAPER SCISSORS
// ==========================================

async function startRPS(message) {
  const row = new ActionRowBuilder().addComponents(
    ["حجر", "ورقة", "مقص"].map(choice =>
      new ButtonBuilder()
        .setCustomId(`rps:${choice}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const attachment = new AttachmentBuilder(
    makeImage(db.names.rps, "اختر حركتك", "✂️"),
    { name: "rps.png" }
  );

  return message.reply({
    embeds: [
      makeEmbed(db.names.rps, "اختر حجر أو ورقة أو مقص!")
        .setImage("attachment://rps.png")
    ],
    files: [attachment],
    components: [row]
  });
}

// ==========================================
// MAFIA
// ==========================================

async function startMafiaJoin(message) {
  const id = message.guild.id;

  if (!mafiaGames.has(id)) {
    mafiaGames.set(id, {
      players: [],
      running: false,
      votes: {},
      roles: {},
      channelId: message.channel.id
    });
  }

  const game = mafiaGames.get(id);

  if (game.running) {
    return message.reply("اللعبة بدأت بالفعل.");
  }

  if (game.players.includes(message.author.id)) {
    return message.reply("أنت منضم بالفعل.");
  }

  game.players.push(message.author.id);
  game.channelId = message.channel.id;

  const attachment = new AttachmentBuilder(
    makeImage(db.names.mafia, "انضم إلى اللعبة", "🕵️"),
    { name: "mafia.png" }
  );

  return message.channel.send({
    embeds: [
      makeEmbed(
        db.names.mafia,
        `تم انضمام ${message.author}!\n\n👥 عدد اللاعبين: **${game.players.length}**\n\nللبدء: \`مافيا بدء\``
      ).setImage("attachment://mafia.png")
    ],
    files: [attachment]
  });
}

async function startMafia(message) {
  const id = message.guild.id;
  const game = mafiaGames.get(id);

  if (!game || game.players.length < 4) {
    return message.reply("تحتاج إلى 4 لاعبين على الأقل. اكتب `مافيا انضمام`.");
  }

  if (game.running) {
    return message.reply("اللعبة بدأت بالفعل.");
  }

  game.running = true;
  game.votes = {};
  game.roles = {};

  const shuffled = [...game.players].sort(() => Math.random() - 0.5);
  const count = Math.max(1, Math.floor(shuffled.length / 4));

  shuffled.forEach((player, index) => {
    game.roles[player] = index < count ? "مافيا" : "مواطن";
  });

  for (const player of shuffled) {
    try {
      const user = await client.users.fetch(player);
      await user.send({
        embeds: [
          makeEmbed(
            "🕵️ دورك في مافيا MAIN",
            `دورك السري هو: **${game.roles[player]}**\nلا تكشف دورك للآخرين!`
          )
        ]
      });
    } catch (error) {
      // قد تكون الرسائل الخاصة مغلقة
    }
  }

  const channel = await client.channels.fetch(game.channelId);

  await channel.send({
    embeds: [
      makeEmbed(
        "🕵️ بدأت لعبة المافيا",
        `عدد اللاعبين: **${game.players.length}**\nتم إرسال الأدوار بالخاص.\n\nناقشوا فيما بينكم، ثم استخدموا:\n\`تصويت @العضو\``
      )
    ]
  });
}

async function mafiaVote(message) {
  const game = mafiaGames.get(message.guild.id);
  const target = message.mentions.users.first();

  if (!game || !game.running || !target) {
    return message.reply("استخدم: `تصويت @العضو` أثناء لعبة المافيا.");
  }

  if (!game.players.includes(message.author.id) ||
      !game.players.includes(target.id) ||
      target.id === message.author.id) {
    return message.reply("التصويت متاح للاعبين المشاركين فقط.");
  }

  game.votes[message.author.id] = target.id;

  const voted = Object.keys(game.votes).length;

  if (voted < game.players.length) {
    return message.reply(
      `تم تسجيل تصويتك ضد ${target}.\nالتصويت: ${voted}/${game.players.length}`
    );
  }

  const counts = {};

  Object.values(game.votes).forEach(id => {
    counts[id] = (counts[id] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) {
    game.votes = {};
    return message.channel.send("🤝 تعادل في التصويت! أعيدوا التصويت.");
  }

  const eliminated = sorted[0][0];
  const role = game.roles[eliminated];

  game.players = game.players.filter(id => id !== eliminated);
  delete game.roles[eliminated];
  game.votes = {};

  const mafiaLeft = Object.values(game.roles).filter(
    role => role === "مافيا"
  ).length;

  const citizensLeft = Object.values(game.roles).filter(
    role => role === "مواطن"
  ).length;

  if (mafiaLeft === 0 || mafiaLeft >= citizensLeft) {
    game.running = false;

    const winner = mafiaLeft === 0 ? "المواطنون" : "المافيا";

    return message.channel.send({
      embeds: [
        makeEmbed(
          "🏆 انتهت لعبة المافيا",
          `تم إخراج <@${eliminated}> وكان دوره **${role}**.\n\nالفائز: **${winner}**`
        )
      ]
    });
  }

  return message.channel.send({
    embeds: [
      makeEmbed(
        "🗳️ نتيجة التصويت",
        `تم إخراج <@${eliminated}>.\nدوره كان: **${role}**.\n\nالمافيا المتبقية: ${mafiaLeft}\nالمواطنون المتبقون: ${citizensLeft}`
      )
    ]
  });
}

// ==========================================
// LEADERBOARD
// ==========================================

async function showPoints(message) {
  const p = getPlayer(message.author.id);

  return message.reply({
    embeds: [
      makeEmbed(
        "⭐ نقاطك في MAIN",
        `اللاعب: ${message.author}\n\nالنقاط: **${p.points}**\nالانتصارات: **${p.wins}**`
      )
    ]
  });
}

async function showTop(message) {
  const sorted = Object.entries(db.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 10);

  const description = sorted.length
    ? sorted.map(([id, p], i) =>
        `**${i + 1}.** <@${id}> — ${p.points} نقطة`
      ).join("\n")
    : "لا يوجد لاعبون حتى الآن.";

  return message.reply({
    embeds: [makeEmbed("🏆 أفضل لاعبي MAIN", description)]
  });
}

// ==========================================
// RENAME GAMES
// ==========================================

async function renameMenu(message) {
  if (!isAdmin(message.member)) {
    return message.reply("هذا الأمر للإدارة فقط.");
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId("main_rename_select")
    .setPlaceholder("اختر اللعبة التي تريد تغيير اسمها")
    .addOptions(
      Object.entries(db.names)
        .filter(([id]) => id !== "games")
        .map(([id, name]) => ({
          label: name.slice(0, 100),
          value: id
        }))
    );

  return message.reply({
    embeds: [
      makeEmbed(
        "⚙️ تعديل أسماء الألعاب",
        "اختر اللعبة، ثم اكتب الاسم الجديد."
      )
    ],
    components: [
      new ActionRowBuilder().addComponents(select)
    ]
  });
}

// ==========================================
// MESSAGE COMMANDS
// ==========================================

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();

  try {
    // Check active game answers
    for (const [id, game] of activeGames.entries()) {
      if (!id.endsWith(message.channel.id)) continue;
      if (!["fastest", "scramble", "guess", "quiz"].includes(game.type)) continue;

      if (normalize(content) === game.answer) {
        activeGames.delete(id);

        const points = game.type === "fastest" || game.type === "scramble"
          ? 15
          : 10;

        reward(message.author.id, points);

        return message.reply({
          embeds: [
            makeEmbed(
              "🏆 فائز التحدي!",
              `${message.author} أجاب بشكل صحيح!\n\n⭐ حصل على **${points} نقطة**.\nمجموع نقاطه: **${getPlayer(message.author.id).points}**`
            )
          ]
        });
      }
    }

    if (lower === "العاب" || lower === "ألعاب") {
      return showGames(message);
    }

    if (lower === "اسرع" || lower === "الأسرع") {
      return startFastest(message);
    }

    if (lower === "تفكيك" || lower === "تفكيك كلمات") {
      return startScramble(message);
    }

    if (lower === "xo" || lower === "اكس او") {
      return startXO(message);
    }

    if (lower === "حجر ورقة مقص") {
      return startRPS(message);
    }

    if (lower === "خمن" || lower === "خمن الرقم") {
      return startGuess(message);
    }

    if (lower === "سؤال" || lower === "اسئلة" || lower === "أسئلة") {
      return startQuiz(message);
    }

    if (lower === "مافيا انضمام") {
      return startMafiaJoin(message);
    }

    if (lower === "مافيا بدء") {
      return startMafia(message);
    }

    if (lower === "مافيا إيقاف" || lower === "مافيا ايقاف") {
      if (!isAdmin(message.member)) {
        return message.reply("هذا الأمر للإدارة فقط.");
      }

      mafiaGames.delete(message.guild.id);
      return message.reply("تم إيقاف لعبة المافيا.");
    }

    if (lower.startsWith("تصويت ")) {
      return mafiaVote(message);
    }

    if (lower === "نقاط") {
      return showPoints(message);
    }

    if (lower === "توب" || lower === "المتصدرين") {
      return showTop(message);
    }

    if (lower === "تعديل لعبة" || lower === "تعديل الالعاب") {
      return renameMenu(message);
    }

  } catch (error) {
    console.error("Message error:", error);
    message.reply("حدث خطأ أثناء تنفيذ الأمر.").catch(() => {});
  }
});

// ==========================================
// INTERACTIONS
// ==========================================

client.on("interactionCreate", async interaction => {
  try {
    // GAME MENU
    if (interaction.isStringSelectMenu()) {

      if (interaction.customId === "main_select_game") {
        const commands = {
          fastest: "اسرع",
          mafia: "مافيا انضمام",
          scramble: "تفكيك",
          xo: "xo",
          rps: "حجر ورقة مقص",
          guess: "خمن",
          quiz: "سؤال"
        };

        return interaction.reply({
          content: `اكتب الأمر التالي في الروم لبدء اللعبة:\n**${commands[interaction.values[0]]}**`,
          ephemeral: true
        });
      }

      // RENAME MENU
      if (interaction.customId === "main_rename_select") {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: "ليس لديك صلاحية.",
            ephemeral: true
          });
        }

        const id = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`main_rename_${id}`)
          .setTitle("تغيير اسم اللعبة");

        const input = new TextInputBuilder()
          .setCustomId("new_name")
          .setLabel("اكتب الاسم الجديد")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(80)
          .setValue(db.names[id]);

        modal.addComponents(
          new ActionRowBuilder().addComponents(input)
        );

        return interaction.showModal(modal);
      }
    }

    // RENAME MODAL
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("main_rename_")
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: "ليس لديك صلاحية.",
          ephemeral: true
        });
      }

      const id = interaction.customId.replace("main_rename_", "");
      const name = interaction.fields.getTextInputValue("new_name").trim();

      if (!db.names[id] || !name) {
        return interaction.reply({
          content: "اسم غير صالح.",
          ephemeral: true
        });
      }

      db.names[id] = name;
      save();

      return interaction.reply({
        content: `✅ تم تغيير اسم اللعبة إلى **${name}** وحفظه.`,
        ephemeral: true
      });
    }

    // ROCK PAPER SCISSORS
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("rps:")
    ) {
      const userChoice = interaction.customId.split(":")[1];
      const choices = ["حجر", "ورقة", "مقص"];
      const botChoice = randomItem(choices);

      let result = "تعادل!";

      if (userChoice !== botChoice) {
        const won =
          (userChoice === "حجر" && botChoice === "مقص") ||
          (userChoice === "ورقة" && botChoice === "حجر") ||
          (userChoice === "مقص" && botChoice === "ورقة");

        if (won) {
          result = "🏆 فزت! +10 نقاط";
          reward(interaction.user.id, 10);
        } else {
          result = "حظ أوفر في المرة القادمة!";
        }
      }

      return interaction.reply({
        embeds: [
          makeEmbed(
            db.names.rps,
            `اختيارك: **${userChoice}**\nاختيار البوت: **${botChoice}**\n\n${result}`
          )
        ],
        ephemeral: true
      });
    }

    // XO JOIN
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("xojoin:")
    ) {
      const channelId = interaction.customId.split(":")[1];
      const game = activeGames.get(`xo_${channelId}`);

      if (!game || game.players.length !== 1 || game.finished) {
        return interaction.reply({
          content: "المباراة غير متاحة.",
          ephemeral: true
        });
      }

      if (game.players.includes(interaction.user.id)) {
        return interaction.reply({
          content: "أنت منضم بالفعل.",
          ephemeral: true
        });
      }

      game.players.push(interaction.user.id);

      return interaction.update({
        embeds: [
          makeEmbed(
            db.names.xo,
            `❌ <@${game.players[0]}>\n⭕ <@${game.players[1]}>\n\nبدأت المباراة! دور اللاعب الأول.`
          )
        ],
        components: xoRows(game)
      });
    }

    // XO MOVE
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("xo:")
    ) {
      const [, channelId, indexText] = interaction.customId.split(":");
      const game = activeGames.get(`xo_${channelId}`);
      const index = Number(indexText);

      if (!game || game.finished || game.players.length !== 2) {
        return interaction.reply({
          content: "المباراة غير جاهزة.",
          ephemeral: true
        });
      }

      if (game.players[game.turn] !== interaction.user.id) {
        return interaction.reply({
          content: "ليس دورك!",
          ephemeral: true
        });
      }

      if (game.board[index]) {
        return interaction.reply({
          content: "المربع مستخدم.",
          ephemeral: true
        });
      }

      game.board[index] = game.marks[game.turn];

      const winnerMark = xoWinner(game.board);
      const draw = !winnerMark && game.board.every(Boolean);

      if (winnerMark || draw) {
        game.finished = true;
        activeGames.delete(`xo_${channelId}`);

        if (winnerMark) {
          const winnerIndex = game.marks.indexOf(winnerMark);
          const winnerId = game.players[winnerIndex];
          reward(winnerId, 20);

          return interaction.update({
            embeds: [
              makeEmbed(
                db.names.xo,
                `🏆 الفائز: <@${winnerId}>\n\nحصل على 20 نقطة!`
              )
            ],
            components: xoRows(game)
          });
        }

        return interaction.update({
          embeds: [makeEmbed(db.names.xo, "🤝 انتهت المباراة بالتعادل!")],
          components: xoRows(game)
        });
      }

      game.turn = 1 - game.turn;

      return interaction.update({
        embeds: [
          makeEmbed(
            db.names.xo,
            `❌ <@${game.players[0]}>\n⭕ <@${game.players[1]}>\n\nدور: <@${game.players[game.turn]}>`
          )
        ],
        components: xoRows(game)
      });
    }

  } catch (error) {
    console.error("Interaction error:", error);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "حدث خطأ أثناء تنفيذ العملية.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// ==========================================
// READY
// ==========================================

client.once("ready", () => {
  console.log("--------------------------------");
  console.log("✅ MAIN GAMES ONLINE");
  console.log(`🤖 ${client.user.tag}`);
  console.log("--------------------------------");

  client.user.setPresence({
    activities: [{ name: "MAIN GAMES 🎮" }],
    status: "online"
  });
});

client.login(TOKEN);
