import firebase from 'firebase';

import { getRandomProfilePic } from '../helpers/UserHelper';
import { API_URL, FIREBASE_CONFIG } from '../config';

export default class UserService {
  static create(user, callback) {
    console.log("create calle w/ user:", user)
    firebase.auth().createUserWithEmailAndPassword(user.email, user.password)
      .then(res => {
        //TODO: Move to server
        let userObj = {
          public: {
            screenName: user.screenName,
            email: user.email,
            online: true,
            iconUrl: getRandomProfilePic()
          },
          private: {
            conversations: {},
            friends: {},
            notificationToken: null,
            notificationsEnabled: true
          },
          server: {
            coins: 1000,
            level: 1,
            events: {},
            items: {},
            purchaseLog: {},
            quests: {},
            titles: {},
          }
        }
        firebase.database().ref("/users/" + res.uid).set(userObj);
      }).catch(function (error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        callback(errorMessage);
        console.log(errorMessage)
        // ...
      });
  }

  static getHttpToken() {
    return firebase.auth().currentUser.getToken(/* forceRefresh */ true);
  }

  static listenForUserChanges(callback) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        firebase.database().ref("users").child(user.uid).once("value", function (snapshot) {
          let data = snapshot.val();
          if (!data) { callback(null, null); return; }
          data.id = user.uid;
          callback(null, data);
        })
      } else {
        callback(null, null);
      }
    });
  }

  static loadAndListenToFriends(friends, callback) {
    friends && Object.keys(friends).forEach(friendId => {
      firebase.database().ref("users/" + friendId + "/public").on("value", snapshot => {
        let friend = snapshot.val();
        if (!friend) { callback(null, null); }
        friend.id = friendId;
        callback(null, friend);
      })
    })
  }

  static getFriend(friendId, callback) {
    firebase.database().ref("users/" + friendId + "/public").on("value", snapshot => {
      let friend = snapshot.val();
      if (!friend) { callback(null, null); }
      friend.id = friendId;
      callback(null, friend);
    })
  }

  static login(user, callback) {
    let auth = firebase.auth();
    let db = firebase.database();
    auth.signInWithEmailAndPassword(user.email, user.password).then(function (res) {
      callback(null, res);
      db.ref("users").child(res.uid).child("public").update({
        online: true
      })
    }, function (err) {
      callback(err);
    })
  }

  static signout(user) {
    let auth = firebase.auth();
    user.online = false;
    this.updateFields(user, false, ["online"]);
    auth.signOut();
  }

  static monitorOnlineStatus(user) {
    if (!user || !user.id) { return; }
    var amOnline = firebase.database().ref('/.info/connected');
    var userRef = firebase.database().ref("/users/" + user.id + "/public/online");
    amOnline.on('value', snapshot => {
      if (snapshot.val()) {
        userRef.onDisconnect().set(false);
        userRef.set(true);
      }
    });
    userRef.on('value', snapshot => {
      window.setTimeout(() => {
        userRef.set(true)
      }, 2000);
    });
  }

  static updateUser(user) {
    let db = firebase.database();
    db.ref("users/").child(user.id).update(user);
  }

  static updateFields(user, isPrivate, fields) {
    var currentUser = firebase.auth().currentUser;
    if (!fields || !user || !currentUser) {
      return;
    }
    let subObj = isPrivate ? "private" : "public";
    let db = firebase.database();
    var ref = db.ref("users/" + currentUser.uid + "/" + subObj);

    ref.once("value", function (snapshot) {
      let currentUserOnDb = snapshot.val();
      fields.forEach(field => {
        currentUserOnDb[field] = user[subObj][field];
      })
      ref.update(currentUserOnDb);
    }, function (errorObject) {
      console.log("The read in UserServicce.updateFields() failed: " + errorObject.code);
    });
  }


}
