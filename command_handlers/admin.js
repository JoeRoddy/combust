const shell = require("shelljs");
const colors = require("colors");
const prompt = require("prompt");
const firebase = require("firebase");
const fs = require("fs");

const {
  initializeFirebase,
  loginWithMockAccount
} = require("../helpers/firebase_helper");

module.exports = function createAdmin(email) {
  initializeFirebase();
  console.log("firebase initialized");

  if (!email) {
    return promptAcctCreation();
  }

  loginWithMockAccount()
    .then(res => {
      firebase
        .database()
        .ref("/users/publicInfo")
        .orderByChild("email")
        .equalTo(email)
        .on("value", snap => {
          const results = snap.val();
          const matches = Object.keys(results);
          if (matches.length === 1) {
            fs.writeFile("./.delete_me.json", '{"isAdmin":true}', err => {
              if (err) throw err;
              shell.exec(
                //execute from shell to circumvent db rules
                `firebase database:update /users/serverInfo/${
                  matches[0]
                }/ ./.delete_me.json --confirm`
              );
              fs.unlink("./.delete_me.json");
              return process.exit();
            });
          } else {
            console.log(
              "Found multiple users with that email. Delete fake accounts"
            );
            process.exit();
          }
        });
    })
    .catch(err => {
      console.log("err logging in:", err);
    });
};

function onErr(err) {
  console.error(err);
}

function promptAcctCreation() {
  prompt.message = "";

  prompt.start();
  const createAcctMsg = "No email arg passed, create a new account? y/n";
  prompt.get(
    [
      {
        name: createAcctMsg,
        validator: /^(y|n)$/i,
        warning: "y or n"
      }
    ],
    (err, result) => {
      if (err) return;
      const answer = result[createAcctMsg];
      if ("y" === answer.toLowerCase()) {
        createAdminAccountAndUser();
      } else {
        return;
      }
    }
  );
}

function createAdminAccountAndUser() {
  prompt.message = "";
  prompt.start();
  prompt.get(
    [
      {
        name: "email",
        validator: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        warning: "Invalid email"
      },
      {
        name: "password",
        validator: /^\w{4,30}$/,
        warning: "Passwords must be 4-30 characters",
        hidden: true
      },
      {
        name: "repeat password",
        validator: /^\w{4,30}$/,
        warning: "Passwords must be 4-30 characters",
        hidden: true
      }
    ],
    (err, result) => {
      if (err) {
        return onErr(err);
      }
      const { email, password } = result;
      const repeatPassword = result["repeat password"];
      if (repeatPassword !== password) {
        return onErr("Passwords do not match.  Try again.");
      } else {
        //create user account
        const auth = firebase.auth();
        auth
          .createUserWithEmailAndPassword(email, password)
          .then(res => {
            auth.signInWithEmailAndPassword(email, password).then(authRes => {
              if (!authRes.uid) {
                return;
              }
              firebase
                .database()
                .ref("/users/")
                .child(res.uid)
                .set({
                  public: {
                    email: email,
                    online: false,
                    iconUrl:
                      "https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=1950&q=80&ixid=dW5zcGxhc2guY29tOzs7Ozs%3D"
                  },
                  private: {
                    conversations: {},
                    friends: {},
                    notificationToken: null,
                    notificationsEnabled: true
                  },
                  server: {
                    walletBalance: 0,
                    isAdmin: true
                  }
                });
            });
          })
          .catch(error => {
            let errorMessage = error.message;
            console.log(errorMessage);
            if (
              (errorMessage =
                "The email address is already in use by another account.")
            ) {
              prompt.stop();
              //   prompt.start();
              //   return createAdmin();
            }
          });
      }
    }
  );
}
