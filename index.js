const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");

const client = new Discord.Client();

const queue = new Map();

client.once("ready", () => {
  console.log("Ready!");
});
client.once("reconnecting", () => {
  console.log("Reconnecting!");
});
client.once("disconnect", () => {
  console.log("Disconnect!");
});

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}skip`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}stop`)) {
    console.log(serverQueue, "======WHY IS THIS BLANK??====");
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}queue`)) {
    const songsList = serverQueue?.songs;
    if (!songsList) {
      return message.reply("Song List Is Empty!");
    }
    console.log(songsList, "===THIS IS THE CURRENT LIST OF SONGS===");
    songList(message, songsList);
  } else if (message.content.startsWith(`${prefix}deploy`)) {
    await message.guild.commands
      .set(client.commands)
      .then(() => {
        message.reply("Deployed!");
      })
      .catch((err) => {
        message.reply(
          "Could not deploy commands! Make sure the bot has the application.commands permission!"
        );
        console.error(err);
      });
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});
async function execute(message, serverQueue) {
  const args = message.content.split(" ");

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel)
    return message.channel.send(
      "You need to be in a voice channel to play music!"
    );
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send(
      "I need the permissions to join and speak in your voice channel!"
    );
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
  };

  if (!serverQueue) {
    // Creating the contract for our queue
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    // Setting the queue using our contract
    queue.set(message.guild.id, queueContruct);
    // Pushing the song to our songs array
    queueContruct.songs.push(song);

    try {
      // Here we try to join the voicechat and save our connection into our object.
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      // Calling the play function to start a song
      console.log(
        queue,
        "==4=4==THIS IS THE SONG BEING PASSED TO PLAY FUNCTION ==4==4=="
      );
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  // console.log(serverQueue, "=====THERE IS A SONG HERE=====");

  const connection = serverQueue.connection;

  //console.log(connection, "=====THIS IS THE CONNECTION PARAMS =====");

  if (!song) {
    // console.log(song, "=====QUEUE IS EMPTY=====");
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(guild, serverQueue.songs[0]);
    })
    .on("error", (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");
  serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );

  if (!serverQueue)
    return message.channel.send("There is no song that I could stop!");
  console.log("======= NO STOPPY =====");
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

function songList(message, songsList) {
  if (!songsList) {
    return message.channel.send("There Are No Songs Currently In The Queue!");
  }
  const queueEmbed = new Discord.MessageEmbed()
    .setColor(15277667)
    .setTitle("Song Queue")
    .setFooter("Use `!skip` to go to next song");

  queueEmbed.addFields(
    { name: "#", value: `${musicOrderReturns(songsList)}`, inline: true },
    { name: "Name", value: `${musicReturns(songsList)}`, inline: true }
  );

  return message.channel.send(queueEmbed);
}

function musicReturns(songsList) {
  let rowsOfSongNames = "";
  songsList.map((song) => {
    rowsOfSongNames += `${song.title}\n`;
  });

  return rowsOfSongNames;
}

function musicOrderReturns(songsList) {
  let rowsOfSongNumbers = "";
  let songOrderListing = 0;

  for (let i = 0; i < songsList.length; i++) {
    songOrderListing++;
    rowsOfSongNumbers += `${songOrderListing}\n`;
  }

  return rowsOfSongNumbers;
}

client.login(token);

//TODO: SHUFFLE FEATURE WITH RANDOMIZING THE ARRAY
//TODO: TRUNCATE SONG NAMES THAT ARE TOO LONG TO FIT
//TODO: CREATE QUEUE LOOPING FEATURE AND SONG LOOPING FEATURE BY ADDING NEW PARAMETER TO SERVERQUEUE OBJECT
//TODO: https://www.npmjs.com/package/youtube-playlist
//SO THAT WE CAN GRAB ALL SONGS FROM A YOUTUBE PLAYLIST AND PUSH THEM TO THE QUEUE

//WE WILL PROBABLY ALSO WANT A FEATURE TO ADD SPOTIFY SONGS AND PLAYLISTS

//ABOVE ALL, WE WANT TO GET THIS DEPLOYED TO THE CLOUD BEFORE WE DO ANY OF THESE FEATURES
