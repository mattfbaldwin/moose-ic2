const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const spdl = require("spdl-core");
const sdv = require("cbb-npm");
const {
  getPlaylistUrls,
  getPlaylistSongInfo,
} = require("../mooseicbot/services/ytDownloadService");
const {
  getDuration,
  musicReturns,
} = require("../mooseicbot/services/musicMetadataService");
const { scandir } = require("prettier");

const client = new Discord.Client();
let masterConnection;

const queue = new Map();
const music_controls_channel_id = "702536335688204328";

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
let loadingMessageId;
let isMoreSongsToShow = false;
let isQueueLoop = false;
let isSongLoop = false;

//CHECKING FOR COMMANDS
client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  if (message.content.startsWith(`${prefix}play`)) {
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}test`)) {
    const args = message.content.split(" ");

    const spotifySongInfo = await spdl.getInfo(args[1]);

    console.log("spotify playlist", spotifySongInfo);
  } else if (message.content.startsWith(`${prefix}pause`)) {
    serverQueue.connection.dispatcher.pause(true);
    return message.channel.send("Song Is Paused");
  } else if (message.content.startsWith(`${prefix}unpause`)) {
    console.log(serverQueue, "SERVER QUEUE AFTER PAUSING");
    serverQueue.connection.dispatcher.resume();
    return message.channel.send("Song Resumed");
  } else if (message.content.startsWith(`${prefix}loop`)) {
    if (!isQueueLoop && !isSongLoop) {
      isQueueLoop = true;
      return message.channel.send("Looping On Whole Queue");
    } else if (isQueueLoop && !isSongLoop) {
      isSongLoop = true;
      isQueueLoop = false;
      return message.channel.send("Looping On Current Track");
    } else if (!isQueueLoop && isSongLoop) {
      isSongLoop = false;
      isQueueLoop = false;
      return message.channel.send("Looping Is Off");
    }
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

    const verifiedSongsList = songsList.map((undefinedSongCheck) => {
      if (!!undefinedSongCheck) {
        return undefinedSongCheck;
      }
    });

    console.log(
      verifiedSongsList,
      "====== HERE IS THE LIST OF SONGS WHETHER THEY NULL OR NOT ========"
    );

    const { queueEmbed } = songList(message, songsList, null);
    const queueMessage = await message.channel.send(queueEmbed);

    await queueMessage.react("⏬");
    await queueMessage.react("↩️");
  } else if (message.content.startsWith(`${prefix}castle`)) {
    await executeCastle(message, serverQueue);
    return;
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
  } else if (message.content.startsWith(`${prefix}x`)) {
    const universalReactionEmbed = new Discord.MessageEmbed().setImage(
      `https://i.imgur.com/eVz6suf.png`
    );
    message.channel.send(universalReactionEmbed);
  } else if (message.content.startsWith(`${prefix}everybodyclapyourhands`)) {
    message.channel.send(
      "https://tenor.com/view/evangelion-clapping-clapping-hands-japan-sea-gif-13300627"
    );
  } else if (message.content.startsWith(`${prefix}catjam`)) {
    message.channel.send("<a:catjam:797119681877246032>").then((msg) => {
      msg.react("<a:catjam:797119681877246032>");
    });
    // message.react("<a:catjam:797119681877246032>");
  } else if (message.content.startsWith(`${prefix}good`)) {
    const sebastian = new Discord.MessageEmbed().setImage(
      `https://i.imgur.com/7tJ7NcS.jpg`
    );

    message.channel.send(sebastian);
  } else if (message.content.startsWith(`${prefix}mm`)) {
    const today = new Date(Date.now());

    const inputs = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
      group: 50,
    };

    const result = await sdv.cbbScoreboard.getScoreboard(inputs);

    const events = result.events;
    const gamesEmbedText = await getGameTimes(events);

    await message.channel.send(gamesEmbedText);
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
  console.log(
    reaction.message.channel.id,
    "THIS IS THE CHANNEL THAT THE EMOJI GOT CAUGHT IN"
  );

  if (
    user.id != "897897326696353802" &&
    reaction.message.channel.id === "702536335688204328"
  ) {
    //this can also be != author
    const oldQueueMessage = reaction.message;
    const serverQueue = queue.get(oldQueueMessage.guild.id);
    const songsList = serverQueue?.songs;

    if (!songsList) {
      const emptyQueueEmbed = new Discord.MessageEmbed().setTitle(
        "There Are No Songs In Queue"
      );
      oldQueueMessage.edit(emptyQueueEmbed);
      oldQueueMessage.reactions.resolve("⏬").users.remove(user.id);
      oldQueueMessage.reactions.resolve("↩️").users.remove(user.id);
      return;
    }

    if (reaction.emoji.name === "⏬") {
      if (isMoreSongsToShow) {
        console.log(
          "======WE DO HAVE ISMORESONGSTOSHOW ON THE EMOJI REACT======="
        );
        const { arrayOfRemainingSongs, songThatGoesOverCharLimit } =
          musicReturns({ songsList, isSongLoop, isMoreSongsToShow });
        if (arrayOfRemainingSongs) {
          const { queueEmbed: newQueueEmbed, isMoreSongsInQueue } = songList(
            oldQueueMessage,
            arrayOfRemainingSongs,
            songThatGoesOverCharLimit
          );

          if (!isMoreSongsInQueue) {
            if (newQueueEmbed) {
              oldQueueMessage.edit(newQueueEmbed);
            }
            oldQueueMessage.reactions.resolve("⏬").users.remove(user.id);
          } else {
            const { additionalSetOfSongs, additionalSongOverLimit } =
              musicReturns({
                arrayOfRemainingSongs,
                isSongLoop,
                isMoreSongsToShow,
              });
            const { queueEmbed: additionalQueueEmbed } = songList(
              oldQueueMessage,
              additionalSetOfSongs,
              additionalSongOverLimit
            );
            oldQueueMessage.edit(additionalQueueEmbed);
            oldQueueMessage.reactions.resolve("⏬").users.remove(user.id);
          }

          if (isMoreSongsInQueue) {
          }
        }
      } else {
        const {
          arrayOfRemainingSongs,
          songThatGoesOverCharLimit: songThatGoesOverCharLimit,
        } = musicReturns({ songsList, isSongLoop, isMoreSongsToShow });
        oldQueueMessage.reactions.resolve("⏬").users.remove(user.id);
        console.log(
          "NEED TO DETERMINE IF THIS IS FIRST AND ONLY PAGE OR IS LAST PAGE OF LONG QUEUE"
        );
        console.log(
          arrayOfRemainingSongs,
          "===== ARRAY OF REMAINING SONGS THAT WE WANT TO EDIT OLDQUEUE MESSAGE WITH"
        );
        if (arrayOfRemainingSongs.length > 0) {
          const { queueEmbed: newQueueEmbed } = songList(
            oldQueueMessage,
            arrayOfRemainingSongs,
            songThatGoesOverCharLimit
          );

          oldQueueMessage.edit(newQueueEmbed);
          console.log(oldQueueMessage, "====== THE NEW QUEUE MESSAGE =====");
        } else {
          console.log("This is the Complete list");
        }
      }
    } else if (reaction.emoji.name === "↩️") {
      const { queueEmbed: newQueueEmbed } = songList(
        oldQueueMessage,
        songsList,
        null
      );
      isMoreSongsToShow = false;
      oldQueueMessage.edit(newQueueEmbed);
      oldQueueMessage.reactions.resolve("↩️").users.remove(user.id);
    }
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
    console.log("youtube or spotify url", args[1]);
    if (!message.content.includes("spotify")) {
      const songInfo = await ytdl.getInfo(args[1], options);
      const duration = getDuration(songInfo);

      song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
        duration: duration,
      };
    } else if (message.content.includes("spotify")) {
      const songInfo = await spdl.getInfo(args[1]);

      song = {
        title: songInfo.title,
        url: songInfo.url,
        duration: songInfo.duration,
      };
    }
  } else if (message.content.includes("playlist")) {
    message.channel
      .send(
        "<a:catjam:797119681877246032> Loading... Please wait as playlists may take longer to load in than single youtube videos <a:catjam:797119681877246032>"
      )
      .then((msg) => {
        loadingMessageId = msg.id;
      });
    let useTubeArray;
    const playlistUrl = args[1];

    const useTubeResponse = await getPlaylistUrls(playlistUrl);
    useTubeArray = useTubeResponse;

    const playlistSongs = await Promise.all(
      useTubeArray.map(async (useTubeObject) => {
        if (useTubeObject.original_title != "[Deleted video]") {
          try {
            return await getPlaylistSongInfo(
              `https://www.youtube.com/watch?v=${useTubeObject.id}`,
              {
                filter: "audioonly",
                dlChunkSize: 0,
              }
            );
          } catch (error) {
            return;
          }
        }
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

      message.channel.messages
        .fetch({
          around: loadingMessageId,
          limit: 1,
        })
        .then((loadingMessageToDelete) => {
          const fetchedMessage = loadingMessageToDelete.first();
          fetchedMessage.delete();
        });
      message.channel.send(
        `<a:catjam:797119681877246032> Playlist has been added to the queue! <a:catjam:797119681877246032>`
      );
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
      serverQueue.connection.dispatcher.end();
      // queue.delete(message.guild.id);
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
      message.channel.messages
        .fetch({
          around: loadingMessageId,
          limit: 1,
        })
        .then((loadingMessageToDelete) => {
          const fetchedMessage = loadingMessageToDelete.first();
          fetchedMessage.delete();
        });
      return message.channel.send(`Playlist has been added to the queue!`);
    }
  }
}

async function executeCastle(message, serverQueue) {
  const castleUrl = "https://www.youtube.com/watch?v=V-9ubOuIeZ4";

  const options = { filter: "audioonly", dlChunkSize: 0 };
  const songInfo = await ytdl.getInfo(castleUrl, options);
  const duration = getDuration(songInfo);

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

  song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
    duration: duration,
  };

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

  try {
    var connection = await voiceChannel.join();
    queueContract.connection = connection;
    // Calling the play function to start a song
    play(message, queueContract.songs[0]);
  } catch (error) {
    console.log(error);
    queue.delete(message.guild.id);
    return message.channel.send(error);
  }
}

function play(message, song) {
  const serverQueue = queue.get(message.guild.id);

  if (!song && serverQueue.songs < 1) {
    message.channel.messages
      .fetch({ around: latestNowPlayingMessageId, limit: 1 })
      .then((msg) => {
        const fetchedMessage = msg.first();
        fetchedMessage.delete();
      });
    serverQueue.voiceChannel.leave();
    isMoreSongsToShow = false;
    queue.delete(message.guild.id);
    return;
  }

  if (!song && serverQueue.songs.length > 0) {
    console.log("I THINK WE GOT NO SONG HERE, CAP");
    serverQueue.songs.shift();
    play(message, serverQueue.songs[0]);
  }

  if (song.url.includes("spotify")) {
    const options = {
      filter: "audioonly",
      encoderArgs: ["-af", "apulsator=hz=0.09"],
      opusEncoded: true,
    };
    console.log("============= SPOTIFY URL ======", song);
    const dispatcher = serverQueue.connection
      .play(
        spdl(song.url, {
          opusEncoded: true,
          filter: "audioonly",
          encoderArgs: ["-af", "apulsator=hz=0.09"],
        })
      )
      .on("finish", () => {
        if (!isQueueLoop && !isSongLoop) {
          serverQueue.songs.shift();
          play(message, serverQueue.songs[0]);
        } else if (isQueueLoop && !isSongLoop) {
          const songToPutAtEndOfQueue = serverQueue.songs[0];
          serverQueue.songs.shift();
          serverQueue.songs.push(songToPutAtEndOfQueue);
          play(message, serverQueue.songs[0]);
        } else if (!isQueueLoop && isSongLoop) {
          const songToRepeatImmediately = serverQueue.songs[0];
          serverQueue.songs.shift();
          serverQueue.songs.unshift(songToRepeatImmediately);
          play(message, serverQueue.songs[0]);
        }
      })
      .on("error", (error) => {
        console.error(error);
        const millisecondsToWait = 250;
        setTimeout(function () {
          console.log(`${new Date()}: GET FUCKED MINIGET`);
          play(message, song);
        }, millisecondsToWait);
      });

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  } else if (!song.url.includes("spotify")) {
    const options = { filter: "audioonly", dlChunkSize: 0 };
    const dispatcher = serverQueue.connection
      .play(ytdl(song.url, options))
      .on("finish", () => {
        if (!isQueueLoop && !isSongLoop) {
          serverQueue.songs.shift();
          play(message, serverQueue.songs[0]);
        } else if (isQueueLoop && !isSongLoop) {
          const songToPutAtEndOfQueue = serverQueue.songs[0];
          serverQueue.songs.shift();
          serverQueue.songs.push(songToPutAtEndOfQueue);
          play(message, serverQueue.songs[0]);
        } else if (!isQueueLoop && isSongLoop) {
          const songToRepeatImmediately = serverQueue.songs[0];
          serverQueue.songs.shift();
          serverQueue.songs.unshift(songToRepeatImmediately);
          play(message, serverQueue.songs[0]);
        }
      })
      .on("error", (error) => {
        console.error(error);
        const millisecondsToWait = 250;
        setTimeout(function () {
          console.log(`${new Date()}: GET FUCKED MINIGET`);
          play(message, song);
        }, millisecondsToWait);
      });

    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  }

  const nowPlayingEmbed = new Discord.MessageEmbed()
    .setTitle(
      `<a:catjam:797119681877246032> Now Playing <a:catjam:797119681877246032>`
    )
    .setDescription(`**${song.title}**`);

  if (isSongLoop) {
    nowPlayingEmbed.setFooter("Song Loop Is On");
  }

  if (!latestNowPlayingMessageId) {
    message.channel.send(nowPlayingEmbed).then((msg) => {
      latestNowPlayingMessageId = msg.id;
    });
  } else {
    message.channel.messages
      .fetch({ around: latestNowPlayingMessageId, limit: 1 })
      .then((msg) => {
        const fetchedMessage = msg.first();
        fetchedMessage.delete();
        message.channel.send(nowPlayingEmbed).then((newMessage) => {
          latestNowPlayingMessageId = newMessage.id;
        });
      });
  }
}

function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the music!"
    );
  if (!serverQueue)
    return message.channel.send("There is no song that I could skip!");

  if (isSongLoop) {
    serverQueue.songs.shift();
  }
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
  serverQueue.connection.dispatcher.end();
}

function songList(message, songsList, numberToStartAt) {
  let isMoreSongsInQueue = false;
  if (!songsList && message) {
    return message.channel.send("There Are No Songs Currently In The Queue!");
  }

  let defaultFooter =
    "Sorry this looks like ass on mobile... Use `!skip` to go to next song";

  const queueEmbed = new Discord.MessageEmbed()
    .setColor(15277667)
    .setTitle("Song Queue")
    .setFooter(defaultFooter);

  if (!numberToStartAt) {
    indexToStartAt = null;
    const {
      rowsOfSongNames,
      durationList,
      musicIndexList,
      remainingSongsMessage,
      arrayOfRemainingSongs,
      isContinue,
    } = musicReturns({
      songsList,
      indexToStartAt,
      isSongLoop,
      isMoreSongsToShow,
    });

    isMoreSongsToShow = isContinue;
    queueEmbed.setFooter(remainingSongsMessage + "\n" + defaultFooter);

    queueEmbed.react;
    if (!rowsOfSongNames) {
      console.log("Full Queue Is Already Showing");
      isMoreSongsInQueue = false;
      queueEmbed = null;
      return { queueEmbed, isMoreSongsInQueue };
    } else {
      queueEmbed.addFields(
        { name: "#", value: "" + musicIndexList + "", inline: true },
        { name: "Name", value: "" + rowsOfSongNames + "", inline: true },
        { name: "Duration", value: "" + durationList + "", inline: true }
      );
    }
  } else {
    const {
      rowsOfSongNames,
      durationList,
      musicIndexList,
      remainingSongsMessage,
      isContinue,
    } = musicReturns({
      songsList,
      numberToStartAt,
      isSongLoop,
      isMoreSongsToShow,
    });

    queueEmbed.setFooter(remainingSongsMessage + "\n" + defaultFooter);

    queueEmbed.react;
    queueEmbed.addFields(
      { name: "#", value: "" + musicIndexList + "", inline: true },
      { name: "Name", value: "" + rowsOfSongNames + "", inline: true },
      { name: "Duration", value: "" + durationList + "", inline: true }
    );

    isMoreSongsToShow = isContinue;
  }

  return { queueEmbed, isMoreSongsInQueue };
}

async function getGameTimes(events) {
  const todaysGames = await mapTodaysGames(events);

  const queueEmbed = new Discord.MessageEmbed()
    .setColor(15277667)
    .setTitle("Today's Games");

  queueEmbed.addField("Games", todaysGames);

  return queueEmbed;
}

const mapTodaysGames = async (events) => {
  let todaysGamesText = "";
  events.map((scheduledGame) => {
    const scheduledGameDate = new Date(scheduledGame.date);
    const gameTimeToString = scheduledGameDate.toLocaleString("en-US", {
      timeZone: "America/Chicago",
    });
    const gameStatus = scheduledGame.status;
    console.log(gameStatus);
    const gameCompetition = scheduledGame.competitions[0];
    const gameCompetitors = gameCompetition.competitors;

    if (gameStatus.type.name === "STATUS_FINAL") {
      const gameScore = `FINAL SCORE:
       ${gameCompetitors[0].team.displayName} ${gameCompetitors[0].score}
      ${gameCompetitors[1].team.displayName} ${gameCompetitors[1].score}\n\n`;

      todaysGamesText += gameScore;
    } else if (gameStatus.type.name === "STATUS_SCHEDULED") {
      const gameTime = `${gameCompetitors[0].team.displayName} VS. ${gameCompetitors[1].team.displayName}
      START TIME: ${gameTimeToString} CST\n\n`;

      todaysGamesText += gameTime;
    } else {
      const gameScore = `Time: ${gameStatus.displayClock} - Period: ${gameStatus.period}
       ${gameCompetitors[0].team.displayName} ${gameCompetitors[0].score}
      ${gameCompetitors[1].team.displayName} ${gameCompetitors[1].score}\n\n`;

      console.log("JAYHAWKS", gameScore);

      todaysGamesText += gameScore;
    }
  });

  return todaysGamesText;
};
// function musicReturns(songsList, indexToStartAt) {
//   let rowsOfSongNames = "";
//   let durationList = "";
//   let musicIndexList = "";
//   let arrayOfRemainingSongs = [];
//   let songThatGoesOverCharLimit;
//   let isContinue = false;

//   let combinedReturnsForCharLimit =
//     durationList + musicIndexList + rowsOfSongNames;

//   let remainingSongsMessage =
//     "Add More Songs By Typing '!play' and then pasting your youtube before hitting enter";
//   let mapBreakerOuter = false;

//   songsList.map((song, index) => {
//     if (!mapBreakerOuter) {
//       if (combinedReturnsForCharLimit.length < 1000) {
//         if (song.title.length > 30) {
//           const truncatedSongTitle = song.title.substr(0, 30);
//           rowsOfSongNames += `${truncatedSongTitle}...\n`;
//         } else {
//           rowsOfSongNames += `${song.title}\n`;
//         }
//         durationList += `${song.duration}\n`;

//         if (!indexToStartAt) {
//           if (index == 0 && isSongLoop) {
//             musicIndexList += `${index + 1} (Looping)\n`;
//           } else {
//             musicIndexList += `${index + 1}\n`;
//           }
//         } else {
//           musicIndexList += `${index + indexToStartAt}\n`;
//         }

//         const combinedMappedLists =
//           musicIndexList + rowsOfSongNames + musicIndexList;
//         combinedReturnsForCharLimit = combinedMappedLists;

//         isMoreSongsToShow = false;
//         isContinue = false;
//       } else {
//         songThatGoesOverCharLimit = index + 1;

//         for (let i = index; i < songsList.length; i++) {
//           arrayOfRemainingSongs.push(songsList[i]);
//         }

//         remainingSongsMessage = arrayOfRemainingSongs.length + " More Track(s)";
//         mapBreakerOuter = true;

//         isMoreSongsToShow = true;
//         isContinue = true;
//       }
//     }
//   });

//   return {
//     rowsOfSongNames,
//     durationList,
//     musicIndexList,
//     remainingSongsMessage,
//     arrayOfRemainingSongs,
//     songThatGoesOverCharLimit,
//     isContinue,
//   };
// }

client.login(token);

//TODO: SHUFFLE FEATURE WITH RANDOMIZING THE ARRAY
//TODO: CREATE QUEUE LOOPING FEATURE AND SONG LOOPING FEATURE BY ADDING NEW PARAMETER TO SERVERQUEUE OBJECT

//TODO: If there is no queue, and there are no arguments for !play, go straight to Peach's Castle

//WE WILL PROBABLY ALSO WANT A FEATURE TO ADD SPOTIFY SONGS AND PLAYLISTS

//ABOVE ALL, WE WANT TO GET THIS DEPLOYED TO THE CLOUD BEFORE WE DO ANY OF THESE FEATURES
