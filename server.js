
const express = require('express')
const expApp = express()

const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const serviceAccount = require("./mobilon-service-account.json");

PORT = 3000

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://mobilon-2c8d0-default-rtdb.asia-southeast1.firebasedatabase.app/',
});
expApp.use(express.json());

let registrationTokens = [];
const db = admin.database();


const tokensRef = db.ref('registrationTokens');
tokensRef.once('value', (snapshot) => {
  snapshot.forEach((childSnapshot) => {
    const token = childSnapshot.val().token;
    registrationTokens.push(token);
  });
  console.log('Initial tokens: ', registrationTokens);
});

expApp.get('/', function (req, res) {
  res.send('Hello Sir')
})



expApp.post('/registerDevice', function (req, res) {
  const token = req.body.token;
  if (!registrationTokens.includes(token)){
    registrationTokens.push(token);
    const tokensRef = db.ref('registrationTokens');
    tokensRef.push({ token });
  }
  console.log("tokens: ", registrationTokens);
  res.send("Done")
})

expApp.post('/deleteAccount', function (req, res) {
  const tokenToRemove = req.body.token;
  const indexToRemove = registrationTokens.indexOf(tokenToRemove);

  if (indexToRemove !== -1) {
    registrationTokens.splice(indexToRemove, 1);

    // Remove the registration token from the database
    tokensRef.orderByChild('token').equalTo(tokenToRemove).once('value', (snapshot) => {
      snapshot.forEach((childSnapshot) => {
        childSnapshot.ref.remove();
      });
    });

    console.log('tokens: ', registrationTokens);
    res.send('Done');
  } else {
    res.send('Token not found');
  }
});



expApp.post('/sendPushNotifications', function (req, res) {
  var title = req.body.title
  var body = req.body.body

  const message = {
    notification: {
      title: title,
      body: body
    },
    tokens: registrationTokens,
    priority: "high",
    android: {
        priority: "high"
    }
  };

  getMessaging(app).sendEachForMulticast(message)
    .then((response) => {
      if (response.failureCount > 0) {
        var failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(registrationTokens[idx]);
          }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
      } else {
        console.log('Notifications were sent successfully');
        res.send('Hello Sir Notifications are being Sent')
      }
    });

})


expApp.listen(PORT, () => {
  console.log(`Resonate Backend listening on port ${PORT}`);
});