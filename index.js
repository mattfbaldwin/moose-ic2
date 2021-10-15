const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const ytlist = require("youtube-playlist");
const usetube = require("usetube");

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
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}queue`)) {
    const songsList = serverQueue?.songs;
    if (!songsList) {
      return message.reply("Song List Is Empty!");
    }
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
  let song;
  let unMappedPlaylist;
  console.log(message.content);
  if (!message.content.includes("playlist")) {
    const options = { filter: "audioonly", dlChunkSize: 0 };
    const songInfo = await ytdl.getInfo(args[1], options);
    const duration = getDuration(songInfo);

    song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
      duration: duration,
    };
  } else if (message.content.includes("playlist")) {
    let useTubeArray;
    const playlistUrl = args[1];

    const useTubeResponse = await getPlaylistUrls(playlistUrl);
    useTubeArray = useTubeResponse;

    // console.log(useTubeArray, "probably running first because its async");

    const playlistSongs = await Promise.all(
      useTubeArray.map(async (useTubeObject) => {
        return await getPlaylistSongInfo(
          `https://www.youtube.com/watch?v=${useTubeObject.id}`,
          {
            filter: "audioonly",
            dlChunkSize: 0,
          }
        );
      })
    );

    console.log(playlistSongs, "========HELLO=======");

    unMappedPlaylist = playlistSongs;
  }
  if (!serverQueue) {
    // Creating the contract for our queue
    const queueContract = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    // Setting the queue using our contract
    queue.set(message.guild.id, queueContract);
    // Pushing the song to our songs array if its just 1 song
    if (!!song) {
      queueContract.songs.push(song);
    }

    if (!song && !!unMappedPlaylist) {
      unMappedPlaylist.map((playlistEntry) => {
        queueContract.songs.push(playlistEntry);
      });
    }

    try {
      // Here we try to join the voicechat and save our connection into our object.
      var connection = await voiceChannel.join();
      queueContract.connection = connection;
      // Calling the play function to start a song
      play(message.guild, queueContract.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    if (!!song) {
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} has been added to the queue!`);
    }

    if (!song && !!unMappedPlaylist) {
      unMappedPlaylist.map((playlistEntry) => {
        serverQueue.songs.push(playlistEntry);
      });
      return message.channel.send(`${song.title} has been added to the queue!`);
    }
  }
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const options = { filter: "audioonly", dlChunkSize: 0 };

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, options))
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
  serverQueue.songs = [];
  serverQueue.connection.stop();
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
    { name: "Name", value: `${musicReturns(songsList)}`, inline: true },
    { name: "Duration", value: `${durationReturns(songsList)}`, inline: true }
  );

  return message.channel.send(queueEmbed);
}

function getDuration(songInfo) {
  const seconds = songInfo.videoDetails.lengthSeconds;
  const duration = new Date(seconds * 1000).toISOString().substr(11, 8);

  return duration;
}

function musicReturns(songsList) {
  let rowsOfSongNames = "";
  songsList.map((song) => {
    rowsOfSongNames += `${song.title}\n`;
  });

  return rowsOfSongNames;
}

function durationReturns(songsList) {
  let rowsOfDurations = "";
  songsList.map((song) => {
    rowsOfDurations += `${song.duration}\n`;
  });

  return rowsOfDurations;
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

const getPlaylistUrls = async (playlistUrl) => {
  const playlistArgs = playlistUrl.split("=");
  const playListId = playlistArgs[1];

  const playList = await usetube.getPlaylistVideos(playListId).then();

  // console.log(playList, "Response From UseTube");
  return playList;
};

const getPlaylistSongInfo = async (playlistVideoUrl, options) => {
  // const playlistSongInfo = await ytdl.getInfo(playlistVideoUrl, options);
  const songInfo = await ytdl
    .getInfo(playlistVideoUrl, options)
    .then((playListSongInfo) => {
      return playListSongInfo;
    });

  const duration = getDuration(songInfo);

  song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
    duration: duration,
  };

  return song;
};

client.login(token);

//TODO: SHUFFLE FEATURE WITH RANDOMIZING THE ARRAY
//TODO: TRUNCATE SONG NAMES THAT ARE TOO LONG TO FIT
//TODO: CREATE QUEUE LOOPING FEATURE AND SONG LOOPING FEATURE BY ADDING NEW PARAMETER TO SERVERQUEUE OBJECT

//WE WILL PROBABLY ALSO WANT A FEATURE TO ADD SPOTIFY SONGS AND PLAYLISTS

//ABOVE ALL, WE WANT TO GET THIS DEPLOYED TO THE CLOUD BEFORE WE DO ANY OF THESE FEATURES
