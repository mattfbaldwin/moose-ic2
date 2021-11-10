const ytdl = require("ytdl-core");
const usetube = require("usetube");
const { getDuration } = require("../services/musicMetadataService");

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

module.exports = {
  getPlaylistUrls,
  getPlaylistSongInfo,
};
