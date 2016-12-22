class ZeroPost extends ZeroFrame {
    addMessage (username, message) {
        var message_escaped = message.replace(/</g, "&lt;").replace(/>/g, "&gt;")  // Escape html tags in the message
        this.messages.innerHTML += "<li><b>" + username + "</b>: " + message_escaped + "</li>"
    }

    onOpenWebsocket () {
        this.messages = document.getElementById("messages")
        this.loadMessages()
        this.addMessage("System", "Ready to call ZeroFrame API!")
        this.cmd("siteInfo", {}, (site_info) => {
  if (site_info.cert_user_id)
      document.getElementById("select_user").innerText = site_info.cert_user_id
  this.site_info = site_info
})
    }

// allows user signatures.
  selectUser () {
      this.cmd("certSelect", {accepted_domains: ["zeroid.bit"]})
      return false
  }

// displays user info
      onRequest (cmd, message) {
          if (cmd == "setSiteInfo") {
              if (message.params.cert_user_id)
                  document.getElementById("select_user").innerHTML = message.params.cert_user_id
              else
                  document.getElementById("select_user").innerHTML = "Select user"
              this.site_info = message.params  // Save site info data to allow access it later

              // Reload messages if new file arrives
              if (message.params.event[0] == "file_done")
                  this.loadMessages()
          }
      }

// sendMessage class

      sendMessage () {
          if (!this.site_info.cert_user_id) {  // No account selected, display error
              this.cmd("wrapperNotification", ["info", "Please, select your account."])
              return false
          }

          // This is our data file path
          var inner_path = "data/users/" + this.site_info.auth_address + "/data.json"

          // Load our current messages
          this.cmd("fileGet", {"inner_path": inner_path, "required": false}, (data) => {
              if (data)  // Parse current data file
                  var data = JSON.parse(data)
              else  // Not exists yet, use default data
                  var data = { "message": [] }

              // Add the new message to data
              data.message.push({
                  "body": document.getElementById("message").value,
                  "date_added": Date.now()
              })

              // Encode data array to utf8 json text
              var json_raw = unescape(encodeURIComponent(JSON.stringify(data, undefined, '\t')))

              // Write file to disk
              this.cmd("fileWrite", [inner_path, btoa(json_raw)], (res) => {
                 this.loadMessages()
                  if (res == "ok") {
                      // Reset the message input
                      document.getElementById("message").value = ""
                      // Publish the file to other users
                      this.cmd("sitePublish", {"inner_path": inner_path})
                  } else {
                      this.cmd("wrapperNotification", ["error", "File write error: #{res}"])
                  }
              })
          })

          return false
      }

      loadMessages () {
          this.cmd("dbQuery", ["SELECT * FROM message LEFT JOIN json USING (json_id) ORDER BY date_added DESC"], (messages) => {
              document.getElementById("messages").innerHTML = ""  // Always start with empty messages
              for (var i=0; i < messages.length; i++) {
                  this.addMessage(messages[i].cert_user_id, messages[i].body)
              }
          })
      }

}

page = new ZeroPost()
