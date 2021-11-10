function getDuration(songInfo) {
  const seconds = songInfo.videoDetails.lengthSeconds;
  const duration = new Date(seconds * 1000).toISOString().substr(11, 8);

  return duration;
}

const musicReturns = ({
  songsList,
  indexToStartAt,
  isSongLoop,
  isMoreSongsToShow,
}) => {
  let rowsOfSongNames = "";
  let durationList = "";
  let musicIndexList = "";
  let arrayOfRemainingSongs = [];
  let songThatGoesOverCharLimit;
  let isContinue = false;

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

        if (!indexToStartAt) {
          if (index == 0 && isSongLoop) {
            musicIndexList += `${index + 1} (Looping)\n`;
          } else {
            musicIndexList += `${index + 1}\n`;
          }
        } else {
          musicIndexList += `${index + indexToStartAt}\n`;
        }

        const combinedMappedLists =
          musicIndexList + rowsOfSongNames + musicIndexList;
        combinedReturnsForCharLimit = combinedMappedLists;

        isMoreSongsToShow = false;
        isContinue = false;
      } else {
        songThatGoesOverCharLimit = index + 1;

        for (let i = index; i < songsList.length; i++) {
          arrayOfRemainingSongs.push(songsList[i]);
        }
        console.log("===== ARE WE FLIPPING IS CONTINUE ====");
        remainingSongsMessage = arrayOfRemainingSongs.length + " More Track(s)";
        mapBreakerOuter = true;

        isMoreSongsToShow = true;
        isContinue = true;
      }
    }
  });

  console.log(arrayOfRemainingSongs, "=====ARRAY OF REMAINING SONGS =====");
  return {
    rowsOfSongNames,
    durationList,
    musicIndexList,
    remainingSongsMessage,
    arrayOfRemainingSongs,
    songThatGoesOverCharLimit,
    isContinue,
    isMoreSongsToShow,
  };
};

module.exports = {
  getDuration,
  musicReturns,
};
