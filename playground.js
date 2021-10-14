const songArray = [
  {
    title: "Castle Grounds Ambience - Super Mario 64",
    url: "https://www.youtube.com/watch?v=V-9ubOuIeZ4",
  },
];

const goodSong = [{
  _events: [Object: null prototype] {
    debug: [Function (anonymous)],
    error: [Function (anonymous)]
  },
  _eventsCount: 2,
  _maxListeners: undefined,
  dispatcher: null,
  streamingData: { channels: 2, sequence: 1, timestamp: 960 },
  voiceConnection: <ref *2> VoiceConnection {
    _events: [Object: null prototype] {
      closing: [Array],
      debug: [Function (anonymous)],
      failed: [Function],
      disconnect: [Function]
    },
    _eventsCount: 4,
    _maxListeners: undefined,
    voiceManager: ClientVoiceManager {
      connections: [Collection [Map]],
      broadcasts: []
    },
    channel: VoiceChannel {
      type: 'voice',
      deleted: false,
      id: '688176988950888474',
      name: 'Professional Collaboration',
      rawPosition: 0,
      parentID: '688176988950888466',
      permissionOverwrites: [Collection [Map]],
      bitrate: 43000,
      userLimit: 15,
      guild: [Guild]
    },
    status: 0,
    speaking: Speaking { bitfield: 0 },
    authentication: {
      sessionID: '99f584966bb58a7bd2aed05c221e5b4c',
      token: '717d606291bd4e34',
      endpoint: 'us-central6879.discord.media',
      streams: [Array],
      ssrc: 94240,
      port: 50002,
      modes: [Array],
      ip: '138.128.141.200',
      experiments: [Array],
      mode: 'xsalsa20_poly1305_lite',
      video_codec: 'H264',
      secret_key: [Uint8Array],
      media_session_id: 'b8bbda055c84a91492811325c9828b5f',
      audio_codec: 'opus'
    },
    player: [Circular *1],
    ssrcMap: Map(1) { 93118 => [Object] },
    _speaking: Map(0) {},
    sockets: { ws: [VoiceWebSocket], udp: [VoiceConnectionUDPClient] },
    receiver: VoiceReceiver {
      _events: [Object: null prototype] {},
      _eventsCount: 0,
      _maxListeners: undefined,
      connection: [Circular *2],
      packets: [PacketHandler],
      [Symbol(kCapture)]: false
    },
    connectTimeout: Timeout {
      _idleTimeout: -1,
      _idlePrev: null,
      _idleNext: null,
      _idleStart: 98732,
      _onTimeout: null,
      _timerArgs: undefined,
      _repeat: null,
      _destroyed: true,
      [Symbol(refed)]: true,
      [Symbol(kHasPrimitive)]: false,
      [Symbol(asyncId)]: 5532,
      [Symbol(triggerId)]: 0
    },
    [Symbol(kCapture)]: false
  },
  [Symbol(kCapture)]: false
}]

const badSong = {
  sessionID: "f37e9a9efc312223a2189ba8034bab63",
  token: "428a6627eb439a4c",
  endpoint: "us-central6879.discord.media",
  streams: [
    {
      type: "video",
      ssrc: 94083,
      rtx_ssrc: 94084,
      rid: "",
      quality: 0,
      active: false,
    },
  ],
  ssrc: 94082,
  port: 50002,
  modes: [
    "aead_aes256_gcm_rtpsize",
    "aead_aes256_gcm",
    "xsalsa20_poly1305_lite_rtpsize",
    "xsalsa20_poly1305_lite",
    "xsalsa20_poly1305_suffix",
    "xsalsa20_poly1305",
  ],
  ip: "138.128.141.200",
  experiments: ["bwe_conservative_link_estimate", "bwe_remote_locus_client"],
  mode: "xsalsa20_poly1305_lite",
  video_codec: "H264",

  media_session_id: "b8bbda055c84a91492811325c9828b5f",
  audio_codec: "opus",
};
