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
  if (authToken == undefined) return;
  console.log(authToken);

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
      // not sure what the app is using for its logic, but we are getting a lot more videos that are displayed in the app...
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
});
