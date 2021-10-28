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

let latestNowPlayingMessageId;
let latestNowPlayingMessage;

//CHECKING FOR COMMANDS
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
    const queueMessage = await message.channel.send(
      songList(message, songsList)
    );
    await queueMessage.react("⏬");
    await queueMessage.react("↩️");
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
  } else if (message.content.startsWith(`${prefix}manningface`)) {
    const manningFaceEmbed = new Discord.MessageEmbed().setImage(
      `https://i.kym-cdn.com/entries/icons/facebook/000/016/212/manning.jpg`
    );
    message.channel.send(manningFaceEmbed);
  } else if (message.content.startsWith(`${prefix}universalReaction`)) {
    const universalReactionEmbed = new Discord.MessageEmbed().setImage(
      `https://i.imgur.com/eVz6suf.png`
    );
    message.channel.send(universalReactionEmbed);
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});

//CHECKING FOR EMOJIS
client.on("messageReactionAdd", async (reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error(
        "Something went wrong when fetching the reacted message",
        error
      );

      return;
    }
  }

  const oldQueueMessage = reaction.message;
  console.log("User", user.id);
  console.log("Old Queue Message", JSON.stringify(oldQueueMessage));

  //this can also be != author
  if (user.id != "897897326696353802") {
    const newQueueEmbed = new Discord.MessageEmbed()
      .setTitle("CHECK OUT THIS NEW GUY")
      .setDescription("WOAH HFASDHFOSUDAHFDUASIHFADFHADSJKFHASKJFHASJKH");
    oldQueueMessage.edit(newQueueEmbed);
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
    message.reply("Loading...");
    let useTubeArray;
    console.log(`we've got a playlist`);
    const playlistUrl = args[1];

    const useTubeResponse = await getPlaylistUrls(playlistUrl);
    useTubeArray = useTubeResponse;

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
      play(message, queueContract.songs[0]);
    } catch (err) {
      // Printing the error message if the bot fails to join the voicechat
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    if (!!song) {
      serverQueue.songs.push(song);
      return message.channel.send(
        `<a:catjam:797119681877246032> ${song.title} has been added to the queue! <a:catjam:797119681877246032>`
      );
    }

    if (!song && !!unMappedPlaylist) {
      unMappedPlaylist.map((playlistEntry) => {
        serverQueue.songs.push(playlistEntry);
      });
      return message.channel.send(`Playlist has been added to the queue!`);
    }
  }
}

function play(message, song) {
  const serverQueue = queue.get(message.guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(message.guild.id);
    return;
  }

  const options = { filter: "audioonly", dlChunkSize: 0 };

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, options))
    .on("finish", () => {
      serverQueue.songs.shift();
      play(message, serverQueue.songs[0]);
      //console.log("CONTENT", latestNowPlayingMessage);
    })
    .on("error", (error) => console.error(error));

  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

  const nowPlayingEmbed = new Discord.MessageEmbed()
    .setTitle(
      `<a:catjam:797119681877246032> Now Playing <a:catjam:797119681877246032>`
    )
    .setDescription(`**${song.title}**`);

  if (!latestNowPlayingMessageId) {
    message.channel.send(nowPlayingEmbed);
    latestNowPlayingMessageId = message.channel.lastMessageID;
    latestNowPlayingMessage = message.channel.messages.fetch(
      latestNowPlayingMessageId
    );
  } else {
    console.log(message.channel.lastMessageID);
  }
  console.log(latestNowPlayingMessage);
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

  let defaultFooter =
    "Sorry this looks like ass on mobile... Use `!skip` to go to next song";

  const queueEmbed = new Discord.MessageEmbed()
    .setColor(15277667)
    .setTitle("Song Queue")
    .setFooter(defaultFooter);
  const {
    rowsOfSongNames,
    durationList,
    musicIndexList,
    remainingSongsMessage,
  } = musicReturns(songsList);

  queueEmbed.setFooter(remainingSongsMessage + "\n" + defaultFooter);

  queueEmbed.react;

  queueEmbed.addFields(
    { name: "#", value: "" + musicIndexList + "", inline: true },
    { name: "Name", value: "" + rowsOfSongNames + "", inline: true },
    { name: "Duration", value: "" + durationList + "", inline: true }
  );

  return queueEmbed;
}

function getDuration(songInfo) {
  const seconds = songInfo.videoDetails.lengthSeconds;
  const duration = new Date(seconds * 1000).toISOString().substr(11, 8);

  return duration;
}

function musicReturns(songsList) {
  let rowsOfSongNames = "";
  let durationList = "";
  let musicIndexList = "";

  let combinedReturnsForCharLimit =
    durationList + musicIndexList + rowsOfSongNames;

  let remainingSongsMessage =
    "Add More Songs By Typing '!play' and then pasting your youtube before hitting enter";
  let mapBreakerOuter = false;
  songsList.map((song, index) => {
    if (!mapBreakerOuter) {
      if (combinedReturnsForCharLimit.length < 1000) {
        if (song.title.length > 30) {
          const truncatedSongTitle = song.title.substr(0, 30);
          rowsOfSongNames += `${truncatedSongTitle}...\n`;
        } else {
          rowsOfSongNames += `${song.title}\n`;
        }
        durationList += `${song.duration}\n`;
        musicIndexList += `${index + 1}\n`;

        const combinedMappedLists =
          musicIndexList + rowsOfSongNames + musicIndexList;
        combinedReturnsForCharLimit = combinedMappedLists;
      } else {
        let arrayOfRemainingSongs = [];
        console.log(`INDEX OF SONG FROM SONGSLIST: ${index + 1}`);
        console.log("Length of Total Song List", songsList.length);
        for (let i = index; i < songsList.length; i++) {
          arrayOfRemainingSongs.push(songsList[i]);
        }
        console.log("List Of Remaining Songs", arrayOfRemainingSongs);
        remainingSongsMessage = arrayOfRemainingSongs.length + " More Track(s)";
        mapBreakerOuter = true;
      }
    }
  });

  return {
    rowsOfSongNames,
    durationList,
    musicIndexList,
    remainingSongsMessage,
  };
}

const getPlaylistUrls = async (playlistUrl) => {
  const playlistArgs = playlistUrl.split("=");
  const playListId = playlistArgs[1];
  let playlist;
  try {
    playlist = await usetube.getPlaylistVideos(playListId);
  } catch (error) {
    throw new Error("Error Retrieving Playlist Videos");
  }
  //return map of playlist videos metadata objects
  return playlist;
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
