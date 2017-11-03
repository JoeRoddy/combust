import firebase from "firebase";

class MessageService {
  sendMessage(convoId, message) {
    if (!convoId || !message) {
      return;
    }
    message.createdAt = new Date().getTime();
    let db = firebase.database();
    let msgRef = db.ref("messages").push();
    let msgId = msgRef.key;
    msgRef.set(message);
    db.ref("conversations/" + convoId + "/messages/" + msgId).set(true);
  }

  listenForNewMessages(convoId, callback) {
    if (!convoId) {
      return;
    }
    let db = firebase.database();
    db
      .ref("conversations/" + convoId + "/messages")
      .on("child_added", snapshot => {
        let msgId = snapshot.key;
        db
          .ref("messages/")
          .child(msgId)
          .once("value", (err, msg) => {
            callback(msg);
          });
      });
  }

  toggleUserTyping(convoId, userId, isTyping) {
    if (!convoId || !userId) {
      return;
    }
    let ref = firebase
      .database()
      .ref("conversations/" + convoId + "/participants/" + userId);
    ref.set(isTyping);
  }

  listenToConversation(convoId, callback) {
    if (!convoId) {
      return;
    }
    let db = firebase.database();
    db.ref("conversations/" + convoId).on("value", snapshot => {
      let msgId = snapshot.key;
      let convo = snapshot.val();
      convo.id = convoId;
      callback(convo);
    });
  }

  createConversation(req, callback) {
    //TODO:
  }
}

export let userService = new UserService();
// import { notifications } from "./notifications.js";
