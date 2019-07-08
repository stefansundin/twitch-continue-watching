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

    function add_video(edge) {
      let div = document.createElement("div");
      div.classList.add("video");

      let a1 = document.createElement("a");
      a1.title = `${to_duration(edge.history.position)} / ${to_duration(edge.node.lengthSeconds)} (${to_percent(edge.history.position/edge.node.lengthSeconds)})`;
      a1.classList.add("thumbnail");
      a1.target = "_blank";
      a1.href = `https://www.twitch.tv/videos/${edge.node.id}`;
      let img = document.createElement("img");
      img.src = edge.node.previewThumbnailURLLarge;
      img.classList.add("thumbnail");
      a1.appendChild(img);
      let progress = document.createElement("progress");
      progress.value = edge.history.position;
      progress.max = edge.node.lengthSeconds;
      a1.appendChild(progress);
      div.appendChild(a1);

      let p1 = document.createElement("p");
      p1.classList.add("channel");
      let a2 = document.createElement("a");
      a2.target = "_blank";
      a2.href = `https://www.twitch.tv/${edge.node.owner.login}`;
      let channel_logo = document.createElement("img");
      channel_logo.src = edge.node.owner.profileImageURL;
      channel_logo.classList.add("channel_logo");
      a2.appendChild(channel_logo);
      let span1 = document.createElement("span");
      span1.classList.add("channel_name");
      span1.appendChild(document.createTextNode(edge.node.owner.displayName));
      a2.appendChild(span1);
      p1.appendChild(a2);
      div.appendChild(p1);

      let p2 = document.createElement("p");
      p2.classList.add("video_title");
      p2.title = edge.node.vodTitle;
      let a3 = document.createElement("a");
      a3.target = "_blank";
      a3.href = `https://www.twitch.tv/videos/${edge.node.id}`;
      a3.appendChild(document.createTextNode(edge.node.vodTitle));
      p2.appendChild(a3);
      div.appendChild(p2);

      let p3 = document.createElement("p");
      p3.appendChild(document.createTextNode(`${relative_date(new Date(edge.history.updatedAt))} | ${edge.node.game.name}`));
      div.appendChild(p3);

      videos.appendChild(div);
    }

    fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "Client-ID": client_id,
        "Authorization": `OAuth ${authToken}`,
      },
      body: '{"operationName":"ResumeWatchingVideosQuery","variables":{"limit":10},"extensions":{"persistedQuery":{"version":1,"sha256Hash":"1543abd5de45fdef0ab9715cc52aafbc5cb45b43735b2ceedffbab2d92689dd2"}},"query":"query ResumeWatchingVideosQuery($limit: Int!) {  currentUser {    __typename    viewedVideos(first: $limit) {      __typename      edges {        __typename        history {          __typename          position          updatedAt        }        node {          __typename          ...VodModelFragment        }      }    }  }}fragment VodModelFragment on Video {  __typename  id  broadcastType  vodDate: createdAt  owner {    __typename    ...ChannelModelFragment  }  game {    __typename    name    id  }  self {    __typename    isRestricted  }  lengthSeconds  previewThumbnailURLMedium: previewThumbnailURL(width: 320, height: 180)  previewThumbnailURLLarge: previewThumbnailURL(width: 640, height: 360)  publishedAt  vodTitle: title  vodViewCount: viewCount  contentTags {    __typename    ...TagModelFragment  }}fragment ChannelModelFragment on User {  __typename  stream {    __typename    id    game {      __typename      id      name    }  }  ...ChannelModelWithoutStreamModelFragment}fragment ChannelModelWithoutStreamModelFragment on User {  __typename  channelId: id  profileViewCount  followers {    __typename    totalCount  }  description  login  displayName  profileImageURL(width: 300)  bannerImageURL  roles {    __typename    isPartner    isAffiliate  }}fragment TagModelFragment on Tag {  __typename  id  localizedName  tagName  isAutomated  isLanguageTag  localizedDescription}"}',
    })
    .then(function(response) {
      console.log(response);
      return response.json();
    })
    .then(function(json) {
      console.log(json);
      if (json == null) {
        return;
      }

      status.classList.add("hidden");
      let data = json.data.currentUser.viewedVideos.edges.filter(function(edge) {
        // not sure what the app is using for its logic, but we are getting a lot more videos than are displayed in the app...
        return edge.history.position > 300;
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
        window.close();
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
