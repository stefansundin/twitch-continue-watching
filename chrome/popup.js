function pad(n) {
  return `0${n}`.slice(-2);
}

function to_duration(t) {
  t = Math.round(t);
  var seconds = t % 60;
  var minutes = Math.floor(t / 60) % 60;
  var hours = Math.floor(t / 3600);
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  else {
    return `${minutes}:${pad(seconds)}`;
  }
}

function to_percent(n) {
  return `${Math.round(n*100)}%`;
}

function relative_date(d) {
  const now = new Date();
  if (d.getFullYear() == now.getFullYear() && d.getMonth() == now.getMonth() && d.getDate() == now.getDate()) {
    return "Today";
  }
  if (d.getFullYear() == now.getFullYear() && d.getMonth() == now.getMonth() && d.getDate() == now.getDate()-1) {
    return "Yesterday";
  }
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function error(reason) {
  const status = document.getElementById("status");
  status.removeChild(status.firstChild);
  status.appendChild(document.createTextNode(`Error: ${reason}`));
}

document.addEventListener("DOMContentLoaded", async function() {
  const client_id = "kimne78kx3ncx6brgo4mv6wki5h1ko";

  const authToken = await new Promise((resolve, reject) => {
    chrome.cookies.get({
      url: "https://www.twitch.tv/",
      name: "auth-token",
    }, function(cookie) {
      if (cookie == null) {
        reject("Not logged in to Twitch?");
        return;
      }
      resolve(cookie.value);
    });
  }).catch(error);
  if (authToken) {
    console.log(authToken);

    const status = document.getElementById("status");
    const videos = document.getElementById("videos");
    const more_container = document.getElementById("more_container");
    const more = document.getElementById("more");

    function add_video(entry) {
      let div = document.createElement("div");
      div.classList.add("video");

      let a1 = document.createElement("a");
      a1.title = `${to_duration(entry.position)} / ${to_duration(entry.video.length)} (${to_percent(entry.position/entry.video.length)})`;
      a1.classList.add("thumbnail");
      a1.target = "_blank";
      a1.href = entry.video.url;
      let img = document.createElement("img");
      img.src = entry.video.preview.medium;
      img.classList.add("thumbnail");
      a1.appendChild(img);
      let progress = document.createElement("progress");
      progress.value = entry.position;
      progress.max = entry.video.length;
      a1.appendChild(progress);
      div.appendChild(a1);

      let p1 = document.createElement("p");
      p1.classList.add("channel");
      let a2 = document.createElement("a");
      a2.target = "_blank";
      a2.href = entry.video.channel.url;
      let channel_logo = document.createElement("img");
      channel_logo.src = entry.video.channel.logo;
      channel_logo.classList.add("channel_logo");
      a2.appendChild(channel_logo);
      let span1 = document.createElement("span");
      span1.classList.add("channel_name");
      span1.appendChild(document.createTextNode(entry.video.channel.display_name));
      a2.appendChild(span1);
      p1.appendChild(a2);
      div.appendChild(p1);

      let p2 = document.createElement("p");
      p2.classList.add("video_title");
      p2.title = entry.video.title;
      let a3 = document.createElement("a");
      a3.target = "_blank";
      a3.href = entry.video.url;
      a3.appendChild(document.createTextNode(entry.video.title));
      p2.appendChild(a3);
      div.appendChild(p2);

      let p3 = document.createElement("p");
      p3.appendChild(document.createTextNode(`${relative_date(new Date(entry.updated_at))} | ${entry.video.game}`));
      div.appendChild(p3);

      videos.appendChild(div);
    }

    const externalUserID = await new Promise((resolve) => {
      chrome.cookies.get({
        url: "https://www.twitch.tv/",
        name: "persistent",
      }, function(cookie) {
        if (cookie == null) {
          reject("Problem reading cookies...");
          return;
        }
        resolve(cookie.value.split("%")[0]);
      });
    }).catch(error);
    console.log(externalUserID);

    fetch(`https://api.twitch.tv/v5/resumewatching/user/${externalUserID}`, {
      headers: {
        "User-Agent": "okhttp/3.9.1", // using what the Android app uses
        "Accept": "application/vnd.twitchtv.v3+json",
        "client-id": client_id,
        "Authorization": `OAuth ${authToken}`,
      }
    })
    .then(function(response) {
      console.log(response);
      return response.json();
    })
    .then(function(data) {
      console.log(data);
      if (data == null) {
        return;
      }

      status.classList.add("hidden");
      data = data.filter(function(entry) {
        // not sure what the app is using for its logic, but we are getting a lot more videos than are displayed in the app...
        return entry.position > 300;
      });

      data.slice(0, 5).forEach(add_video);
      if (data.length > 5) {
        more_container.classList.remove("hidden");
        more.addEventListener("click", function() {
          more_container.parentNode.removeChild(more_container);
          data.slice(5).forEach(add_video);
        }, false);
      }
    });
  }



  const spoiler_free_container = document.getElementById("spoiler_free_container");
  const next_video_button = document.getElementById("next_video");
  const prev_video_button = document.getElementById("prev_video");
  let tab;

  function seek_video() {
    let navigate = -1;
    if (this == prev_video_button) {
      navigate = 1;
    }

    let video_id = tab.url.split("/")[4];
    if (video_id.includes("?")) {
      video_id = video_id.split("?")[0];
    }

    fetch(`https://api.twitch.tv/helix/videos?id=${video_id}`, {
      headers: {
        "Client-ID": client_id,
      }
    })
    .then(function(response) {
      console.log(response);
      return response.json();
    })
    .then(function(data) {
      console.log(data);
      if (data == null) {
        alert("Bad response from server.");
        return;
      }
      console.log(data.data[0]);
      const user_id = data.data[0].user_id;

      fetch(`https://api.twitch.tv/helix/videos?user_id=${user_id}`, {
        headers: {
          "Client-ID": client_id,
        }
      })
      .then(function(response) {
        console.log(response);
        return response.json();
      })
      .then(function(data) {
        console.log(data);
        if (data == null) {
          alert("Bad response from server.");
          return;
        }
        const i = data.data.findIndex(function(video) {
          return video_id == video.id;
        });
        if (i == -1) {
          alert("Could not find this video in the user's videos.. needs pagination probably.");
          return;
        }
        if (i+navigate < 0) {
          alert("This is the most recent video from this user.");
          return;
        }
        if (i+navigate >= data.data.length) {
          alert("This is the oldest video from this user. There may be more, but this code can't paginate yet.");
          return;
        }
        const video = data.data[i+navigate];
        chrome.tabs.update(tab.id, {
          url: video.url,
        });
      });
    });
  }

  chrome.tabs.query({
    currentWindow: true,
    active: true,
  }, function(tabs) {
    tab = tabs[0];
    console.log(tabs);
    if (tab.url.startsWith("https://www.twitch.tv/videos/")) {
      spoiler_free_container.classList.remove("hidden");
      next_video_button.addEventListener("click", seek_video, false);
      prev_video_button.addEventListener("click", seek_video, false);
    }
  });
});
