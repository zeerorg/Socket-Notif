TO get started:
1. Create a mongodb database. How you do it is upto you.
   This project will need a `notif` database. Make sure you're not using that already.

2. Insert 2 records for bare minimum run. 
   a. "devops" collection : 
                          {
                              "token": `a token name you'll remember`,
                          }
    b. "rooms" collection : 
                          {
                              "token": `token name you put before`,
                              "rooms": [{ 
                                "name": "default",
                                "roomId": `ObjectId()`
                              }]
                          }

3. A "user-devices" collection is created and maintained by itself.

4. To connect you will need to pass atleast "token" and "deviceId" as JSON this deviceId is stored and used for     communicating with device.

5. More steps will be added as they come to me.