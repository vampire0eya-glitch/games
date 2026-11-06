
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
  TextInputStyle
} = require("discord.js");

const fs = require("fs");
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.log("❌ ضع TOKEN في متغيرات الاستضافة");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const COLOR = 0xFFFFFF;
const DB_FILE = "./games-data.json";

const defaultGames = {
  xo: "XO",
  roulette: "الروليت",
  mafia: "مافيا",
  fastest: "الأسرع",
  scramble: "تفكيك الكلمات",
  rps: "حجر ورقة مقص",
  guess: "خمن الرقم",
  quiz: "أسئلة وأجوبة",
  wheel: "عجلة الحظ"
};

let db = {
  names: { ...defaultGames },
  players: {},
  mafia: {}
};

if (fs.existsSync(DB_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    db = {
      ...db,
      ...saved,
      names: { ...defaultGames, ...(saved.names || {}) }
    };
  } catch (e) {
    console.log("تعذر قراءة ملف البيانات، سيتم استخدام بيانات جديدة");
  }
}

function save() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function embed(title, description) {
  return new EmbedBuilder()
    .setColor(COLOR)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: "MAIN GAMES" })
    .setTimestamp();
}

function gameName(id) {
  return db.names[id] || id;
}

function getPlayer(id) {
  if (!db.players[id]) {
    db.players[id] = { points: 0, wins: 0 };
  }
  return db.players[id];
}

function reward(id, points = 10) {
  const player = getPlayer(id);
  player.points += points;
  player.wins++;
  save();
}

function isAdmin(member) {
  return member.permissions.has("Administrator");
}

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
  "بطولة"
];

const questions = [
  { q: "ما عاصمة المملكة العربية السعودية؟", a: "الرياض" },
  { q: "كم عدد أيام الأسبوع؟", a: "7" },
  { q: "ما أكبر كوكب في المجموعة الشمسية؟", a: "المشتري" },
  { q: "ما الحيوان المعروف بسفينة الصحراء؟", a: "الجمل" },
  { q: "كم عدد حروف اللغة العربية؟", a: "28" },
  { q: "ما عاصمة اليابان؟", a: "طوكيو" },
  { q: "ما الكوكب الأحمر؟", a: "المريخ" },
  { q: "كم يساوي 9 × 9؟", a: "81" }
];

const activeGames = new Map();

function shuffleWord(word) {
  let result = word;
  while (result === word && word.length > 2) {
    result = word.split("").sort(() => Math.random() - 0.5).join("");
  }
  return result;
}

function menuRow() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("main_games_menu")
      .setPlaceholder("اختر اللعبة التي تريد لعبها")
      .addOptions(
        Object.entries(db.names).map(([id, name]) => ({
          label: name.slice(0, 100),
          value: id,
          description: `العب ${name}`.slice(0, 100)
        }))
      )
  );
}

async function showGames(message) {
  const description = Object.entries(db.names)
    .map(([id, name], i) => `**${i + 1}.** ${name}`)
    .join("\n");

  await message.reply({
    embeds: [
      embed(
        "🎮 ألعاب MAIN",
        `اختر لعبة من القائمة أو استخدم أوامر الألعاب.\n\n${description}\n\n**الأوامر:**\n\`روليت\` - \`مافيا بدء\` - \`اسرع\` - \`تفكيك\` - \`xo\` - \`نقاط\` - \`توب\``
      )
    ],
    components: [menuRow()]
  });
}

// ========================================
// XP / LEADERBOARD
// ========================================

async function leaderboard(message) {
  const sorted = Object.entries(db.players)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 10);

  const description = sorted.length
    ? sorted.map(([id, p], i) =>
        `**${i + 1}.** <@${id}> — ${p.points} نقطة | ${p.wins} فوز`
      ).join("\n")
    : "لا يوجد لاعبون حتى الآن.";

  message.reply({
    embeds: [embed("🏆 أفضل لاعبي MAIN", description)]
  });
}

// ========================================
// ROULETTE
// ========================================

async function roulette(message) {
  const choices = [
    "🔴 الأحمر",
    "⚫ الأسود",
    "🟢 الأخضر",
    "⭐ نجمة",
    "💎 الماسة"
  ];

  const result = choices[Math.floor(Math.random() * choices.length)];

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("roulette_spin")
      .setLabel("لف العجلة")
      .setEmoji("🎰")
      .setStyle(ButtonStyle.Secondary)
  );

  message.reply({
    embeds: [
      embed(
        gameName("roulette"),
        `اضغط الزر لتدوير عجلة الحظ!\n\n${result}`
      )
    ],
    components: [row]
  });
}

// ========================================
// FASTEST GAME
// ========================================

async function fastest(message) {
  const question = questions[
    Math.floor(Math.random() * questions.length)
  ];

  const id = `fastest_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("هناك تحدٍ شغال بالفعل في هذه الروم.");
  }

  activeGames.set(id, {
    answer: question.a.toLowerCase(),
    type: "fastest"
  });

  message.channel.send({
    embeds: [
      embed(
        gameName("fastest"),
        `⚡ **أول شخص يجيب يفوز!**\n\n${question.q}\n\nلديكم 30 ثانية!`
      )
    ]
  });

  setTimeout(() => {
    if (activeGames.has(id)) {
      activeGames.delete(id);
      message.channel.send(`انتهى التحدي! الإجابة كانت: **${question.a}**`);
    }
  }, 30000);
}

// ========================================
// WORD SCRAMBLE
// ========================================

async function scramble(message) {
  const word = words[Math.floor(Math.random() * words.length)];
  const mixed = shuffleWord(word);
  const id = `scramble_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("يوجد تحدي تفكيك كلمات شغال بالفعل.");
  }

  activeGames.set(id, {
    answer: word.toLowerCase(),
    type: "scramble"
  });

  message.channel.send({
    embeds: [
      embed(
        gameName("scramble"),
        `🔤 رتب الحروف واكتشف الكلمة!\n\n**${mixed.split("").join(" | ")}**\n\nأول إجابة صحيحة تفوز بـ 15 نقطة!`
      )
    ]
  });

  setTimeout(() => {
    if (activeGames.has(id)) {
      activeGames.delete(id);
      message.channel.send(`انتهى التحدي! الكلمة كانت: **${word}**`);
    }
  }, 45000);
}

// ========================================
// GUESS NUMBER
// ========================================

async function guessNumber(message) {
  const number = Math.floor(Math.random() * 10) + 1;
  const id = `guess_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("هناك لعبة تخمين شغالة بالفعل.");
  }

  activeGames.set(id, {
    answer: String(number),
    type: "guess"
  });

  message.reply({
    embeds: [
      embed(
        gameName("guess"),
        "🎯 خمن الرقم من 1 إلى 10!\nأول شخص يكتب الرقم الصحيح يفوز بـ 10 نقاط."
      )
    ]
  });

  setTimeout(() => {
    if (activeGames.has(id)) {
      activeGames.delete(id);
      message.channel.send(`انتهت اللعبة! الرقم كان ${number}`);
    }
  }, 30000);
}

// ========================================
// QUIZ
// ========================================

async function quiz(message) {
  const q = questions[Math.floor(Math.random() * questions.length)];
  const id = `quiz_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("هناك سؤال شغال بالفعل.");
  }

  activeGames.set(id, {
    answer: q.a.toLowerCase(),
    type: "quiz"
  });

  message.reply({
    embeds: [
      embed(gameName("quiz"), `❓ ${q.q}\n\nأول إجابة صحيحة تفوز!`)
    ]
  });

  setTimeout(() => {
    if (activeGames.has(id)) {
      activeGames.delete(id);
      message.channel.send(`انتهى السؤال! الإجابة: **${q.a}**`);
    }
  }, 30000);
}

// ========================================
// XO
// ========================================

async function startXO(message) {
  const id = `xo_${message.channel.id}`;

  if (activeGames.has(id)) {
    return message.reply("هناك مباراة XO شغالة بالفعل.");
  }

  const game = {
    type: "xo",
    players: [message.author.id],
    board: Array(9).fill(null),
    turn: 0,
    finished: false
  };

  activeGames.set(id, game);

  const row = new ActionRowBuilder();

  for (let i = 0; i < 3; i++) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`xo_${id}_${i}`)
        .setLabel(" ")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  const rows = [row];

  for (let r = 1; r < 3; r++) {
    const newRow = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      newRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`xo_${id}_${r * 3 + c}`)
          .setLabel(" ")
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(newRow);
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`xo_join_${message.channel.id}`)
        .setLabel("انضم للمباراة")
        .setStyle(ButtonStyle.Success)
    )
  );

  const msg = await message.reply({
    embeds: [
      embed(
        "❌ XO",
        `اللاعب الأول: ${message.author}\nينتظر لاعباً آخر للانضمام.`
      )
    ],
    components: rows
  });

  game.messageId = msg.id;
  game.messageChannel = message.channel.id;
}

// ========================================
// MAFIA
// ========================================

async function mafia(message, args) {
  const guildId = message.guild.id;
  const channelId = message.channel.id;

  if (!db.mafia[guildId]) {
    db.mafia[guildId] = {
      players: [],
      running: false,
      channelId
    };
  }

  const game = db.mafia[guildId];

  if (args === "بدء") {
    if (game.running) {
      return message.reply("هناك لعبة مافيا شغالة.");
    }

    if (game.players.length < 4) {
      return message.reply("تحتاج 4 لاعبين على الأقل. اكتب `مافيا انضمام` للانضمام.");
    }

    game.running = true;
    game.channelId = channelId;

    const shuffled = [...game.players].sort(() => Math.random() - 0.5);
    const mafiaCount = Math.max(1, Math.floor(shuffled.length / 4));

    game.roles = {};

    shuffled.forEach((id, index) => {
      game.roles[id] = index < mafiaCount ? "مافيا" : "مواطن";
    });

    save();

    for (const id of shuffled) {
      try {
        const user = await client.users.fetch(id);
        await user.send({
          embeds: [
            embed(
              "🕵️ دورك في مافيا MAIN",
              `دورك هو: **${game.roles[id]}**\nلا تكشف دورك للآخرين!`
            )
          ]
        });
      } catch (e) {}
    }

    return message.channel.send({
      embeds: [
        embed(
          "🕵️ بدأت لعبة المافيا",
          `عدد اللاعبين: **${shuffled.length}**\nتم إرسال الأدوار بشكل خاص.\n\nالآن ناقشوا واستخدموا التصويت لكشف المافيا!\n\nللتصويت: \`تصويت @الشخص\``
        )
      ]
    });
  }

  if (args === "انضمام") {
    if (game.running) {
      return message.reply("اللعبة بدأت بالفعل.");
    }

    if (game.players.includes(message.author.id)) {
      return message.reply("أنت منضم بالفعل.");
    }

    game.players.push(message.author.id);
    save();

    return message.reply({
      embeds: [
        embed(
          "🕵️ مافيا MAIN",
          `تم انضمام ${message.author}!\nعدد اللاعبين: **${game.players.length}**`
        )
      ]
    });
  }

  if (args === "إيقاف") {
    if (!isAdmin(message.member)) {
      return message.reply("هذا الأمر للإدارة فقط.");
    }

    db.mafia[guildId] = {
      players: [],
      running: false,
      channelId
    };

    save();
    return message.reply("تم إيقاف لعبة المافيا.");
  }

  message.reply({
    embeds: [
      embed(
        "🕵️ أوامر المافيا",
        "`مافيا انضمام`\n`مافيا بدء`\n`مافيا إيقاف`"
      )
    ]
  });
}

// ========================================
// RENAME GAME
// ========================================

async function renameGame(message) {
  if (!isAdmin(message.member)) {
    return message.reply("❌ هذا الأمر للإدارة فقط.");
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("rename_game_select")
    .setPlaceholder("اختر اللعبة لتغيير اسمها")
    .addOptions(
      Object.entries(db.names).map(([id, name]) => ({
        label: name.slice(0, 100),
        value: id
      }))
    );

  message.reply({
    embeds: [
      embed("⚙️ تعديل أسماء الألعاب", "اختر اللعبة التي تريد تغيير اسمها.")
    ],
    components: [
      new ActionRowBuilder().addComponents(menu)
    ]
  });
}

// ========================================
// MESSAGE COMMANDS
// ========================================

client.on("messageCreate", async message => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  const lower = content.toLowerCase();

  try {
    // Answer active games
    for (const [id, game] of activeGames.entries()) {
      if (
        id.endsWith(message.channel.id) &&
        game.type !== "xo" &&
        lower === game.answer
      ) {
        activeGames.delete(id);
        const points = game.type === "scramble" ? 15 : 10;
        reward(message.author.id, points);

        return message.reply({
          embeds: [
            embed(
              "🏆 إجابة صحيحة!",
              `${message.author} فاز بـ **${points} نقطة**!\nمجموع نقاطه: **${getPlayer(message.author.id).points}**`
            )
          ]
        });
      }
    }

    if (lower === "العاب" || lower === "ألعاب") {
      return showGames(message);
    }

    if (lower === "روليت" || lower === "الروليت") {
      return roulette(message);
    }

    if (lower === "اسرع" || lower === "الأسرع") {
      return fastest(message);
    }

    if (lower === "تفكيك" || lower === "تفكيك كلمات") {
      return scramble(message);
    }

    if (lower === "xo" || lower === "اكس او") {
      return startXO(message);
    }

    if (lower.startsWith("مافيا")) {
      return mafia(message, content.split(/\s+/).slice(1).join(" "));
    }

    if (lower === "خمن" || lower === "خمن الرقم") {
      return guessNumber(message);
    }

    if (lower === "سؤال" || lower === "اسئلة") {
      return quiz(message);
    }

    if (lower === "عجلة الحظ") {
      return roulette(message);
    }

    if (lower === "تعديل لعبة" || lower === "تعديل الالعاب") {
      return renameGame(message);
    }

    if (lower === "نقاط") {
      const p = getPlayer(message.author.id);

      return message.reply({
        embeds: [
          embed(
            "⭐ نقاطك",
            `اللاعب: ${message.author}\nالنقاط: **${p.points}**\nالانتصارات: **${p.wins}**`
          )
        ]
      });
    }

    if (lower === "توب" || lower === "المتصدرين") {
      return leaderboard(message);
    }

    if (lower.startsWith("تصويت ")) {
      const game = db.mafia[message.guild.id];
      const target = message.mentions.users.first();

      if (!game || !game.running || !target) {
        return message.reply("استخدم: `تصويت @الشخص` أثناء لعبة المافيا.");
      }

      if (!game.players.includes(message.author.id) ||
          !game.players.includes(target.id) ||
          target.id === message.author.id) {
        return message.reply("التصويت متاح للاعبين المشاركين فقط.");
      }

      if (!game.votes) game.votes = {};
      game.votes[message.author.id] = target.id;
      save();

      return message.reply(`تم تسجيل تصويتك ضد ${target}.`);
    }

  } catch (error) {
    console.error(error);
    message.reply("حدث خطأ أثناء تنفيذ اللعبة.");
  }
});

// ========================================
// INTERACTIONS
// ========================================

client.on("interactionCreate", async interaction => {
  try {
    // Game menu
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "main_games_menu") {
        const id = interaction.values[0];

        const commands = {
          roulette: "روليت",
          mafia: "مافيا",
          fastest: "اسرع",
          scramble: "تفكيك",
          xo: "xo",
          guess: "خمن",
          quiz: "سؤال",
          wheel: "عجلة الحظ",
          rps: "حجر ورقة مقص"
        };

        if (id === "rps") {
          const row = new ActionRowBuilder().addComponents(
            ["حجر", "ورقة", "مقص"].map(choice =>
              new ButtonBuilder()
                .setCustomId(`rps_${choice}`)
                .setLabel(choice)
                .setStyle(ButtonStyle.Secondary)
            )
          );

          return interaction.reply({
            embeds: [embed(gameName("rps"), "اختر اختيارك!")],
            components: [row]
          });
        }

        return interaction.reply({
          content: `ابدأ اللعبة بكتابة: **${commands[id] || "العاب"}**`,
          ephemeral: true
        });
      }

      if (interaction.customId === "rename_game_select") {
        if (!isAdmin(interaction.member)) {
          return interaction.reply({
            content: "ليس لديك صلاحية.",
            ephemeral: true
          });
        }

        const id = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`rename_modal_${id}`)
          .setTitle("تغيير اسم اللعبة");

        const input = new TextInputBuilder()
          .setCustomId("new_game_name")
          .setLabel("الاسم الجديد")
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

    // Rename modal
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("rename_modal_")
    ) {
      if (!isAdmin(interaction.member)) {
        return interaction.reply({
          content: "ليس لديك صلاحية.",
          ephemeral: true
        });
      }

      const id = interaction.customId.replace("rename_modal_", "");
      const name = interaction.fields.getTextInputValue("new_game_name").trim();

      if (!name || !db.names[id]) {
        return interaction.reply({
          content: "اسم غير صالح.",
          ephemeral: true
        });
      }

      db.names[id] = name;
      save();

      return interaction.reply({
        embeds: [
          embed(
            "✅ تم تغيير الاسم",
            `تم تغيير اسم اللعبة إلى **${name}** بنجاح.`
          )
        ],
        ephemeral: true
      });
    }

    // Roulette button
    if (
      interaction.isButton() &&
      interaction.customId === "roulette_spin"
    ) {
      const choices = ["🔴 الأحمر", "⚫ الأسود", "🟢 الأخضر", "⭐ النجمة", "💎 الماسة"];
      const result = choices[Math.floor(Math.random() * choices.length)];

      return interaction.reply({
        embeds: [
          embed("🎰 نتيجة الروليت", `النتيجة: **${result}**`)
        ],
        ephemeral: true
      });
    }

    // Rock paper scissors
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("rps_")
    ) {
      const userChoice = interaction.customId.replace("rps_", "");
      const choices = ["حجر", "ورقة", "مقص"];
      const botChoice = choices[Math.floor(Math.random() * 3)];

      let result;

      if (userChoice === botChoice) {
        result = "تعادل!";
      } else if (
        (userChoice === "حجر" && botChoice === "مقص") ||
        (userChoice === "ورقة" && botChoice === "حجر") ||
        (userChoice === "مقص" && botChoice === "ورقة")
      ) {
        result = "🏆 فزت! +10 نقاط";
        reward(interaction.user.id, 10);
      } else {
        result = "حظ أوفر المرة القادمة!";
      }

      return interaction.reply({
        embeds: [
          embed(
            "✂️ حجر ورقة مقص",
            `اختيارك: **${userChoice}**\nاختيار البوت: **${botChoice}**\n\n${result}`
          )
        ],
        ephemeral: true
      });
    }

    // XO join
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("xo_join_")
    ) {
      const channelId = interaction.customId.replace("xo_join_", "");
      const id = `xo_${channelId}`;
      const game = activeGames.get(id);

      if (!game || game.players.length !== 1) {
        return interaction.reply({
          content: "المباراة غير متاحة.",
          ephemeral: true
        });
      }

      if (interaction.user.id === game.players[0]) {
        return interaction.reply({
          content: "لا يمكنك اللعب ضد نفسك.",
          ephemeral: true
        });
      }

      game.players.push(interaction.user.id);

      return interaction.reply({
        content: `تم انضمامك للمباراة! ${interaction.user}`,
        ephemeral: true
      });
    }

    // XO board
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("xo_xo_")
    ) {
      const parts = interaction.customId.split("_");
      const id = `${parts[1]}_${parts[2]}_${parts[3]}`;
      const position = Number(parts[4]);
      const game = activeGames.get(id);

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

      if (game.board[position]) {
        return interaction.reply({
          content: "هذا المربع مستخدم.",
          ephemeral: true
        });
      }

      game.board[position] = game.turn === 0 ? "❌" : "⭕";

      const winLines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
      ];

      const winner = winLines.some(line =>
        line.every(index => game.board[index] === game.board[line[0]])
      );

      const draw = game.board.every(Boolean);

      const rows = [];

      for (let r = 0; r < 3; r++) {
        const row = new ActionRowBuilder();

        for (let c = 0; c < 3; c++) {
          const pos = r * 3 + c;

          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`xo_${id}_${pos}`)
              .setLabel(game.board[pos] || " ")
              .setStyle(
                game.board[pos] === "❌"
                  ? ButtonStyle.Danger
                  : game.board[pos] === "⭕"
                    ? ButtonStyle.Primary
                    : ButtonStyle.Secondary
              )
              .setDisabled(!!game.board[pos] || winner || draw)
          );
        }

        rows.push(row);
      }

      if (winner || draw) {
        game.finished = true;

        if (winner) {
          const winnerId = interaction.user.id;
          reward(winnerId, 20);
        }

        activeGames.delete(id);

        return interaction.update({
          embeds: [
            embed(
              "❌ XO",
              winner
                ? `🏆 الفائز: ${interaction.user}\n+20 نقطة`
                : "🤝 تعادل!"
            )
          ],
          components: rows
        });
      }

      game.turn = 1 - game.turn;

      return interaction.update({
        embeds: [
          embed(
            "❌ XO",
            `دور اللاعب: <@${game.players[game.turn]}>\n❌ ضد ⭕`
          )
        ],
        components: rows
      });
    }

  } catch (error) {
    console.error(error);

    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({
        content: "حدث خطأ. حاول مرة أخرى.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} MAIN GAMES ONLINE`);

  client.user.setPresence({
    activities: [{ name: "MAIN Games 🎮" }],
    status: "online"
  });
});

client.login(TOKEN);
