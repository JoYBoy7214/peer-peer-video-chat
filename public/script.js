const socket = io(); // connect to signaling server
const roomId = "test-room"; // hardcoded room

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream;
let peerConnection;
let partnerId = null;

const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" } // free STUN server
  ]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;

    // Create peer connection AFTER we have media
    createPeerConnection();

    // Join room
    socket.emit("join", roomId);
  })
  .catch(err => {
    console.error("Media error:", err);
  });

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);

  // Send our media tracks to the peer
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  // Show remote stream when it's received
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Send ICE candidates to the other peer
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("signal", {
        signal: { candidate: event.candidate },
        target: partnerId
      });
    }
  };
}

// A new user connected, send an offer
socket.on("user-connected", async userId => {
  partnerId = userId;

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("signal", {
    signal: offer,
    target: userId
  });
});

// Receive signaling data
socket.on("signal", async ({ sender, signal }) => {
  partnerId = sender;

  if (signal.type === "offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("signal", { signal: answer, target: sender });
  } else if (signal.type === "answer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
  } else if (signal.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
    } catch (err) {
      console.error("ICE error:", err);
    }
  }
});
