
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");

const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");

// =============================
// MAIN GAMES
// =============================

const TOKEN = process.env.TOKEN;
const COLOR = 0xFFFFFF;

if (!TOKEN) {
  console.log("❌ ضع TOKEN في Environment Variables");
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

const DATA_FILE = path.join(__dirname, "games-data.json");

let data = {
  names: {},
  points: {}
};

if (fs.existsSync(DATA_FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!data.names) data.names = {};
    if (!data.points) data.points = {};
  } catch {
    console.log("تعذر قراءة ملف البيانات، سيتم إنشاء بيانات جديدة.");
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// =============================
// ARABIC FONT - WITHOUT UPLOADING A FONT FILE
// =============================

let arabicFontLoaded = false;

const FONT_CANDIDATES = [
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
  "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/tahoma.ttf"
];

for (const fontPath of FONT_CANDIDATES) {
  try {
    if (fs.existsSync(fontPath)) {
      const loaded = GlobalFonts.registerFromPath(fontPath, "MainArabic");

      if (loaded) {
        arabicFontLoaded = true;
        console.log("✅ تم تحميل خط النظام:", fontPath);
        break;
      }
    }
  } catch (error) {
    console.log("تعذر تحميل الخط:", error.message);
  }
}

if (!arabicFontLoaded) {
  console.log("⚠️ لم يتم العثور على خط عربي معروف في الاستضافة.");
}

// =============================
// GAMES
// =============================

const games = [
  { id: "fast", name: "الأسرع" },
  { id: "scramble", name: "تفكيك الكلمات" },
  { id: "xo", name: "إكس أو" },
  { id: "rps", name: "حجر ورقة مقص" },
  { id: "quiz", name: "أسئلة عامة" },
  { id: "number", name: "تخمين الرقم" },
  { id: "mafia", name: "مافيا" },
  { id: "leaderboard", name: "المتصدرين" }
];

function gameName(id) {
  return data.names[id] ||
    games.find(g => g.id === id)?.name ||
    id;
}

function addPoints(userId, amount) {
  data.points[userId] = (data.points[userId] || 0) + amount;
  saveData();
}

// =============================
// IMAGE FUNCTIONS
// =============================

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? line + " " + word : word;

    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }

  if (line) lines.push(line);

  const finalLines = lines.slice(0, maxLines);
  const startY = y - ((finalLines.length - 1) * lineHeight) / 2;

  finalLines.forEach((textLine, index) => {
    ctx.fillText(
      textLine,
      x,
      startY + index * lineHeight,
      maxWidth
    );
  });
}

function makeCard(title, subtitle = "", footer = "MAIN GAMES") {
  const canvas = createCanvas(1000, 500);
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 1000, 500);
  gradient.addColorStop(0, "#101010");
  gradient.addColorStop(1, "#444444");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1000, 500);

  // Border
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 18, 964, 464);

  // Text settings
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const font = arabicFontLoaded ? "MainArabic" : "sans-serif";

  // Title
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold 76px "${font}"`;

  drawWrappedText(
    ctx,
    title,
    500,
    155,
    900,
    85,
    2
  );

  // Subtitle
  ctx.fillStyle = "#EEEEEE";
  ctx.font = `bold 48px "${font}"`;

  drawWrappedText(
    ctx,
    subtitle,
    500,
    290,
    880,
    65,
    3
  );

  // Footer
  ctx.fillStyle = "#AAAAAA";
  ctx.font = `30px "${font}"`;
  ctx.fillText(footer, 500, 430, 900);

  return canvas.toBuffer("image/png");
}

function imageAttachment(title, subtitle, filename = "main-game.png") {
  const buffer = makeCard(title, subtitle);

  const safeName = filename.endsWith(".png")
    ? filename
    : filename.replace(/\.[^/.]+$/, "") + ".png";

  return new AttachmentBuilder(buffer, {
    name: safeName,
    description: String(title)
  });
}

// =============================
// EMBEDS
// =============================

function embed(title, description = "") {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "MAIN GAMES" })
    .setTimestamp();
}

function isAdmin(member) {
  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

// =============================
// ACTIVE GAMES
// =============================

const activeFast = new Map();
const activeScramble = new Map();
const activeNumber = new Map();
const activeXO = new Map();
const activeMafia = new Map();

const words = [
  "مدرسة",
  "سيارة",
  "كمبيوتر",
  "برمجة",
  "مغامرة",
  "بطولة",
  "مكتبة",
  "طائرة",
  "مستشفى",
  "روبوت",
  "معلومات",
  "تحدي",
  "صندوق",
  "هاتف",
  "مفتاح"
];

const questions = [
  { q: "ما عاصمة المملكة العربية السعودية؟", a: ["الرياض"] },
  { q: "كم عدد أيام الأسبوع؟", a: ["7", "سبعة"] },
  { q: "ما الكوكب المعروف بالكوكب الأحمر؟", a: ["المريخ"] },
  { q: "ما أكبر محيط في العالم؟", a: ["الهادي", "المحيط الهادي"] },
  { q: "كم عدد حروف اللغة العربية؟", a: ["28", "ثمانية وعشرون"] },
  { q: "ما الحيوان المعروف بسفينة الصحراء؟", a: ["الجمل"] }
];

function shuffleWord(word) {
  const chars = [...word];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  if (chars.join("") === word && chars.length > 1) {
    return shuffleWord(word);
  }

  return chars.join("");
}

function normalize(text) {
  return text
    .trim()
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[أإآ]/g, "ا");
}

// =============================
// READY
// =============================

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is online`);

  client.user.setPresence({
    activities: [{ name: "MAIN GAMES 🎮" }],
    status: "online"
  });
});

// =============================
// TEXT COMMANDS
// NO PREFIX - NO SLASH
// =============================

client.on("messageCreate", async message => {
  try {
    if (message.author.bot || !message.guild) return;

    const content = message.content.trim();
    const command = content.toLowerCase();

    // =============================
    // GAMES LIST
    // =============================

    if ([
      "العاب",
      "ألعاب",
      "الالعاب",
      "الألعاب",
      "games"
    ].includes(command)) {
      const description = games
        .filter(g => g.id !== "leaderboard")
        .map(g => `🎮 **${gameName(g.id)}**`)
        .join("\n");

      const file = imageAttachment(
        "قائمة الألعاب",
        "اختر لعبتك وابدأ التحدي"
      );

      return message.reply({
        embeds: [embed("🎮 MAIN GAMES", description)],
        files: [file]
      });
    }

    // =============================
    // HELP
    // =============================

    if ([
      "مساعدة",
      "الاوامر",
      "الأوامر",
      "help"
    ].includes(command)) {
      return message.reply({
        embeds: [
          embed(
            "🎮 أوامر MAIN GAMES",
            `**الألعاب:**
• \`الألعاب\` — عرض الألعاب
• \`الأسرع\` — اكتب الكلمة الظاهرة بالصورة
• \`فكك\` — رتب الحروف
• \`اكس او\` — لعبة إكس أو
• \`حجر ورقة مقص\` — تحدي البوت
• \`سؤال\` — سؤال عام
• \`تخمين\` — خمن الرقم
• \`مافيا\` — إنشاء غرفة مافيا
• \`المتصدرين\` — ترتيب النقاط

**الإدارة:**
• \`تغيير الألعاب\` — تغيير أسماء الألعاب (للإداريين)`
          )
        ]
      });
    }

    // =============================
    // FASTEST
    // =============================

    if ([
      "الأسرع",
      "الاسرع",
      "fast"
    ].includes(command)) {
      if (activeFast.has(message.channel.id)) {
        return message.reply(
          "هناك تحدي أسرع جارٍ بالفعل في هذه الروم."
        );
      }

      const word = words[
        Math.floor(Math.random() * words.length)
      ];

      const file = imageAttachment(
        "اكتب الكلمة بسرعة!",
        word,
        "fast-word.png"
      );

      const sent = await message.channel.send({
        content: "⏱️ **أمامكم 15 ثانية! أول شخص يكتب الكلمة يفوز.**",
        files: [file]
      });

      activeFast.set(message.channel.id, {
        word: normalize(word),
        messageId: sent.id
      });

      setTimeout(async () => {
        const game = activeFast.get(message.channel.id);

        if (!game || game.messageId !== sent.id) return;

        activeFast.delete(message.channel.id);

        await message.channel.send(
          `انتهى الوقت! الكلمة كانت **${word}**.`
        ).catch(() => {});
      }, 15000);

      return;
    }

    // FAST ANSWER
    const fastGame = activeFast.get(message.channel.id);

    if (fastGame && normalize(content) === fastGame.word) {
      activeFast.delete(message.channel.id);
      addPoints(message.author.id, 5);

      return message.reply({
        embeds: [
          embed(
            "🏆 فائز التحدي!",
            `أسرع لاعب هو ${message.author}\nحصل على **5 نقاط**!`
          )
        ]
      });
    }

    // =============================
    // SCRAMBLE
    // =============================

    if ([
      "فكك",
      "تفكيك",
      "تفكيك كلمات"
    ].includes(command)) {
      if (activeScramble.has(message.channel.id)) {
        return message.reply(
          "هناك تحدي كلمات جارٍ بالفعل."
        );
      }

      const word = words[
        Math.floor(Math.random() * words.length)
      ];

      const scrambled = shuffleWord(word);

      const file = imageAttachment(
        "رتب الحروف",
        scrambled,
        "scramble.png"
      );

      await message.channel.send({
        content: "🧩 **رتب الحروف واكتب الكلمة الصحيحة!**",
        files: [file]
      });

      activeScramble.set(message.channel.id, word);

      setTimeout(() => {
        if (activeScramble.get(message.channel.id) === word) {
          activeScramble.delete(message.channel.id);

          message.channel.send(
            `انتهى التحدي! الكلمة كانت **${word}**.`
          ).catch(() => {});
        }
      }, 30000);

      return;
    }

    // SCRAMBLE ANSWER
    const scrambleAnswer = activeScramble.get(message.channel.id);

    if (
      scrambleAnswer &&
      normalize(content) === normalize(scrambleAnswer)
    ) {
      activeScramble.delete(message.channel.id);
      addPoints(message.author.id, 5);

      return message.reply(
        `🏆 صحيح! ${message.author} حصل على **5 نقاط**.`
      );
    }

    // =============================
    // XO
    // =============================

    if ([
      "اكس او",
      "إكس أو",
      "xo"
    ].includes(command)) {
      if (activeXO.has(message.channel.id)) {
        return message.reply(
          "هناك لعبة إكس أو جارية بالفعل."
        );
      }

      const game = {
        board: Array(9).fill(null),
        player: message.author.id,
        bot: "BOT",
        turn: message.author.id
      };

      activeXO.set(message.channel.id, game);

      return sendXO(message.channel, game);
    }

    // =============================
    // ROCK PAPER SCISSORS
    // =============================

    if ([
      "حجر ورقة مقص"
    ].includes(command)) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("rps:حجر")
          .setLabel("حجر")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("rps:ورقة")
          .setLabel("ورقة")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("rps:مقص")
          .setLabel("مقص")
          .setStyle(ButtonStyle.Secondary)
      );

      const file = imageAttachment(
        "حجر ورقة مقص",
        "اختر حركتك"
      );

      return message.reply({
        files: [file],
        components: [row]
      });
    }

    // =============================
    // QUIZ
    // =============================

    if ([
      "سؤال",
      "اسئلة",
      "أسئلة"
    ].includes(command)) {
      const q = questions[
        Math.floor(Math.random() * questions.length)
      ];

      const file = imageAttachment(
        "سؤال عام",
        q.q,
        "quiz.png"
      );

      await message.channel.send({
        files: [file],
        content: "🧠 أول إجابة صحيحة تحصل على 5 نقاط!"
      });

      const collector = message.channel.createMessageCollector({
        filter: m => !m.author.bot,
        time: 30000
      });

      collector.on("collect", m => {
        const answer = normalize(m.content);

        if (q.a.some(a => normalize(a) === answer)) {
          addPoints(m.author.id, 5);
          collector.stop("winner");

          message.channel.send(
            `🏆 إجابة صحيحة يا ${m.author}! حصلت على 5 نقاط.`
          );
        }
      });

      collector.on("end", (_, reason) => {
        if (reason !== "winner") {
          message.channel.send(
            `انتهى الوقت! الإجابة: **${q.a[0]}**`
          ).catch(() => {});
        }
      });

      return;
    }

    // =============================
    // NUMBER GUESSING
    // =============================

    if ([
      "تخمين",
      "خمن الرقم",
      "تخمين الرقم"
    ].includes(command)) {
      if (activeNumber.has(message.channel.id)) {
        return message.reply(
          "هناك تحدي تخمين جارٍ بالفعل."
        );
      }

      const number = Math.floor(Math.random() * 20) + 1;

      activeNumber.set(message.channel.id, number);

      const file = imageAttachment(
        "تخمين الرقم",
        "اختر رقمًا من 1 إلى 20",
        "number.png"
      );

      await message.channel.send({
        files: [file],
        content: "🔢 اكتب رقمك في الدردشة. لديك 30 ثانية!"
      });

      setTimeout(() => {
        if (activeNumber.get(message.channel.id) === number) {
          activeNumber.delete(message.channel.id);

          message.channel.send(
            `انتهى الوقت! الرقم كان **${number}**.`
          ).catch(() => {});
        }
      }, 30000);

      return;
    }

    // NUMBER ANSWER
    const numberAnswer = activeNumber.get(message.channel.id);

    if (
      numberAnswer &&
      Number(content) === numberAnswer &&
      content !== ""
    ) {
      activeNumber.delete(message.channel.id);
      addPoints(message.author.id, 5);

      return message.reply(
        `🎉 صحيح! ${message.author} حصل على 5 نقاط.`
      );
    }

    // =============================
    // MAFIA
    // =============================

    if ([
      "مافيا",
      "لعبة مافيا"
    ].includes(command)) {
      if (activeMafia.has(message.channel.id)) {
        return message.reply(
          "هناك غرفة مافيا موجودة بالفعل."
        );
      }

      const lobby = {
        host: message.author.id,
        players: [message.author.id],
        started: false
      };

      activeMafia.set(message.channel.id, lobby);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("mafia:join")
          .setLabel("انضمام")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId("mafia:start")
          .setLabel("بدء اللعبة")
          .setStyle(ButtonStyle.Primary)
      );

      const file = imageAttachment(
        "لعبة المافيا",
        "اجمع اللاعبين وابدأ اللعبة",
        "mafia.png"
      );

      return message.channel.send({
        embeds: [
          embed(
            "🕵️ غرفة المافيا",
            `المضيف: ${message.author}\nعدد اللاعبين: 1\nالحد الأدنى: 4 لاعبين`
          )
        ],
        files: [file],
        components: [row]
      });
    }

    // =============================
    // LEADERBOARD
    // =============================

    if ([
      "المتصدرين",
      "توب",
      "top"
    ].includes(command)) {
      const sorted = Object.entries(data.points)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const lines = sorted.length
        ? sorted.map(
            ([id, points], i) =>
              `**${i + 1}.** <@${id}> — ${points} نقطة`
          ).join("\n")
        : "لا توجد نقاط حتى الآن.";

      const file = imageAttachment(
        "لوحة المتصدرين",
        "أفضل 10 لاعبين",
        "leaderboard.png"
      );

      return message.reply({
        embeds: [embed("🏆 المتصدرين", lines)],
        files: [file]
      });
    }

    // =============================
    // RENAME GAMES
    // =============================

    if ([
      "تغيير الألعاب",
      "تغيير اسماء الألعاب",
      "تعديل الألعاب"
    ].includes(command)) {
      if (!isAdmin(message.member)) {
        return message.reply(
          "هذا الأمر للإداريين فقط."
        );
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId("rename_game")
        .setPlaceholder("اختر اللعبة التي تريد تغيير اسمها")
        .addOptions(
          games
            .filter(g => g.id !== "leaderboard")
            .map(g => ({
              label: gameName(g.id).slice(0, 100),
              value: g.id,
              description: `تغيير اسم لعبة ${gameName(g.id)}`.slice(0, 100)
            }))
        );

      return message.reply({
        embeds: [
          embed(
            "⚙️ إعدادات الألعاب",
            "اختر اللعبة من القائمة لتغيير اسمها."
          )
        ],
        components: [
          new ActionRowBuilder().addComponents(menu)
        ]
      });
    }

  } catch (error) {
    console.error("Message command error:", error);

    message.reply(
      "❌ حدث خطأ أثناء تنفيذ الأمر."
    ).catch(() => {});
  }
});

// =============================
// XO FUNCTIONS
// =============================

async function sendXO(channel, game) {
  const symbols = game.board.map(
    (v, i) => v || String(i + 1)
  );

  const description =
    `\`${symbols[0]} | ${symbols[1]} | ${symbols[2]}\`\n` +
    `\`${symbols[3]} | ${symbols[4]} | ${symbols[5]}\`\n` +
    `\`${symbols[6]} | ${symbols[7]} | ${symbols[8]}\``;

  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  const row3 = new ActionRowBuilder();

  for (let i = 0; i < 9; i++) {
    const button = new ButtonBuilder()
      .setCustomId(`xo:${i}`)
      .setLabel(game.board[i] || String(i + 1))
      .setStyle(
        game.board[i] === "X"
          ? ButtonStyle.Primary
          : game.board[i] === "O"
            ? ButtonStyle.Danger
            : ButtonStyle.Secondary
      )
      .setDisabled(Boolean(game.board[i]));

    if (i < 3) row1.addComponents(button);
    else if (i < 6) row2.addComponents(button);
    else row3.addComponents(button);
  }

  const file = imageAttachment(
    "إكس أو",
    "اختر مربعًا للعب",
    "xo.png"
  );

  await channel.send({
    embeds: [
      embed(
        "❌ لعبة إكس أو",
        description + `\n\nالدور: <@${game.turn}>`
      )
    ],
    files: [file],
    components: [row1, row2, row3]
  });
}

function checkXO(board) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return board[a];
    }
  }

  return board.every(Boolean) ? "draw" : null;
}

// =============================
// INTERACTIONS
// =============================

client.on("interactionCreate", async interaction => {
  try {

    // =============================
    // RENAME GAME MENU
    // =============================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "rename_game"
    ) {
      if (
        !interaction.memberPermissions?.has(
          PermissionsBitField.Flags.Administrator
        )
      ) {
        return interaction.reply({
          content: "للإداريين فقط.",
          ephemeral: true
        });
      }

      const id = interaction.values[0];

      await interaction.reply({
        content:
          `اكتب الاسم الجديد للعبة **${gameName(id)}** في الدردشة خلال 60 ثانية.`,
        ephemeral: true
      });

      const collector = interaction.channel.createMessageCollector({
        filter: m => m.author.id === interaction.user.id,
        time: 60000,
        max: 1
      });

      collector.on("collect", async m => {
        const newName = m.content.trim().slice(0, 50);

        if (!newName) return;

        data.names[id] = newName;
        saveData();

        await m.reply(
          `✅ تم تغيير اسم اللعبة إلى **${newName}**.`
        );
      });

      return;
    }

    // =============================
    // BUTTONS
    // =============================

    if (interaction.isButton()) {

      // =============================
      // RPS
      // =============================

      if (interaction.customId.startsWith("rps:")) {
        const userChoice = interaction.customId.split(":")[1];

        const options = [
          "حجر",
          "ورقة",
          "مقص"
        ];

        const botChoice = options[
          Math.floor(Math.random() * options.length)
        ];

        let result = "تعادل!";

        if (
          (userChoice === "حجر" && botChoice === "مقص") ||
          (userChoice === "ورقة" && botChoice === "حجر") ||
          (userChoice === "مقص" && botChoice === "ورقة")
        ) {
          result = "فزت! حصلت على 3 نقاط.";
          addPoints(interaction.user.id, 3);

        } else if (userChoice !== botChoice) {
          result = "البوت فاز! حاول مرة ثانية.";
        }

        const file = imageAttachment(
          "حجر ورقة مقص",
          `${userChoice} ضد ${botChoice}`,
          "rps-result.png"
        );

        return interaction.reply({
          content:
            `اختيارك: **${userChoice}**\n` +
            `اختيار البوت: **${botChoice}**\n` +
            `${result}`,
          files: [file],
          ephemeral: true
        });
      }

      // =============================
      // XO
      // =============================

      if (interaction.customId.startsWith("xo:")) {
        const game = activeXO.get(interaction.channel.id);

        if (!game) {
          return interaction.reply({
            content: "انتهت اللعبة.",
            ephemeral: true
          });
        }

        if (interaction.user.id !== game.player) {
          return interaction.reply({
            content: "هذه ليست لعبتك.",
            ephemeral: true
          });
        }

        if (game.turn !== game.player) {
          return interaction.reply({
            content: "انتظر دورك.",
            ephemeral: true
          });
        }

        const index = Number(
          interaction.customId.split(":")[1]
        );

        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index > 8 ||
          game.board[index]
        ) {
          return interaction.reply({
            content: "هذا المربع غير متاح.",
            ephemeral: true
          });
        }

        game.board[index] = "X";

        let result = checkXO(game.board);

        if (!result) {
          const available = game.board
            .map((v, i) => v ? null : i)
            .filter(v => v !== null);

          if (available.length) {
            const choice = available[
              Math.floor(Math.random() * available.length)
            ];

            game.board[choice] = "O";
          }

          result = checkXO(game.board);
        }

        if (result) {
          activeXO.delete(interaction.channel.id);

          if (result === "X") {
            addPoints(game.player, 5);
          }

          const text = result === "X"
            ? `🏆 فزت يا ${interaction.user}! حصلت على 5 نقاط.`
            : result === "O"
              ? "فاز البوت! حاول مرة ثانية."
              : "تعادل!";

          return interaction.update({
            content: text,
            embeds: [
              embed(
                "❌ انتهت لعبة إكس أو",
                game.board.map(v => v || "ـ").join(" | ")
              )
            ],
            components: []
          });
        }

        const symbols = game.board.map(v => v || "ـ");
        const rows = [];

        for (let r = 0; r < 3; r++) {
          const row = new ActionRowBuilder();

          for (let c = 0; c < 3; c++) {
            const i = r * 3 + c;

            row.addComponents(
              new ButtonBuilder()
                .setCustomId(`xo:${i}`)
                .setLabel(game.board[i] || String(i + 1))
                .setStyle(
                  game.board[i] === "X"
                    ? ButtonStyle.Primary
                    : game.board[i] === "O"
                      ? ButtonStyle.Danger
                      : ButtonStyle.Secondary
                )
                .setDisabled(Boolean(game.board[i]))
            );
          }

          rows.push(row);
        }

        return interaction.update({
          embeds: [
            embed(
              "❌ لعبة إكس أو",
              `\`${symbols.slice(0, 3).join(" | ")}\`\n` +
              `\`${symbols.slice(3, 6).join(" | ")}\`\n` +
              `\`${symbols.slice(6, 9).join(" | ")}\``
            )
          ],
          components: rows
        });
      }

      // =============================
      // MAFIA JOIN
      // =============================

      if (interaction.customId === "mafia:join") {
        const lobby = activeMafia.get(interaction.channel.id);

        if (!lobby || lobby.started) {
          return interaction.reply({
            content: "الغرفة غير متاحة.",
            ephemeral: true
          });
        }

        if (lobby.players.includes(interaction.user.id)) {
          return interaction.reply({
            content: "أنت منضم بالفعل.",
            ephemeral: true
          });
        }

        lobby.players.push(interaction.user.id);

        return interaction.reply({
          content:
            `✅ انضممت للمافيا! عدد اللاعبين: ${lobby.players.length}`,
          ephemeral: true
        });
      }

      // =============================
      // MAFIA START
      // =============================

      if (interaction.customId === "mafia:start") {
        const lobby = activeMafia.get(interaction.channel.id);

        if (!lobby) {
          return interaction.reply({
            content: "لا توجد غرفة مافيا.",
            ephemeral: true
          });
        }

        if (interaction.user.id !== lobby.host) {
          return interaction.reply({
            content: "المضيف فقط يستطيع بدء اللعبة.",
            ephemeral: true
          });
        }

        if (lobby.players.length < 4) {
          return interaction.reply({
            content: "تحتاج إلى 4 لاعبين على الأقل.",
            ephemeral: true
          });
        }

        if (lobby.started) {
          return interaction.reply({
            content: "اللعبة بدأت بالفعل.",
            ephemeral: true
          });
        }

        lobby.started = true;

        const shuffled = [...lobby.players].sort(
          () => Math.random() - 0.5
        );

        const roles = shuffled.map((id, index) => ({
          id,
          role:
            index === 0
              ? "مافيا"
              : index === 1
                ? "طبيب"
                : "مواطن"
        }));

        for (const player of roles) {
          try {
            const user = await client.users.fetch(player.id);

            await user.send(
              `🕵️ بدأت لعبة المافيا!\nدورك هو: **${player.role}**`
            );

          } catch {
            console.log(
              `تعذر إرسال دور المافيا إلى ${player.id}`
            );
          }
        }

        activeMafia.delete(interaction.channel.id);

        const file = imageAttachment(
          "بدأت المافيا!",
          "تحقق من رسائلك الخاصة لمعرفة دورك",
          "mafia-start.png"
        );

        return interaction.update({
          content:
            "🕵️ **بدأت اللعبة!** تم إرسال أدوار اللاعبين في الخاص.",
          files: [file],
          components: []
        });
      }
    }

  } catch (error) {
    console.error("Interaction error:", error);

    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content: "حدث خطأ أثناء تنفيذ الأمر.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// =============================
// LOGIN
// =============================

client.login(TOKEN).catch(error => {
  console.error("❌ Discord login error:", error);
  process.exit(1);
});
