function fetchProtectedSites(username) {
  return fetch('https://accounts.yeahgames.net/data/accounts.json')
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      var user = data.find(function (user) {
        return user.username === username;
      });

      if (user && user.protectedSites) {
        return user.protectedSites;
      } else {
        return {};
      }
    })
    .catch(function (error) {
      console.error('Error fetching protected sites:', error);
      return {};
    });
}

function checkAuthorization(username, subdomain) {
  return fetchProtectedSites(username)
    .then(function (protectedSites) {
      return protectedSites[subdomain] === true;
    });
}

function redirectToLogin(corrupted) {
  var loginUrl = 'https://accounts.yeahgames.net/login';
  if (corrupted) {
    var continueUrl = encodeURIComponent('https://accounts.yeahgames.net/login?corrupted=true&continue=' + window.location.href);
    loginUrl = 'https://accounts.yeahgames.net/logout?continue=' + continueUrl;
  } else {
    var continueUrl = encodeURIComponent(window.location.href);
    loginUrl += '?continue=' + continueUrl;
  }
  window.location.href = loginUrl;
}

function checkCookieExistence() {
  var cookies = document.cookie.split(';');
  var cookieExists = false;

  for (var i = 0; i < cookies.length; i++) {
    var cookie = cookies[i].trim();

    if (cookie.startsWith('yeahgames_userdata=')) {
      cookieExists = true;
      break;
    }
  }

  return cookieExists;
}

function getTitle(url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          var parser = new DOMParser();
          var htmlDoc = parser.parseFromString(xhr.responseText, 'text/html');
          var title = htmlDoc.querySelector('title').textContent;
          resolve(title);
        } else {
          reject(new Error('Error fetching title'));
        }
      }
    };
    xhr.send();
  });
}

function handleLinkClick(event) {
  if (event.target.tagName === 'A' && event.target.href) {
    event.preventDefault();
    var newUrl = event.target.href;
    window.history.pushState(null, '', newUrl);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  if (!checkCookieExistence()) {
    redirectToLogin();
    return;
  }

  var userData = validateUserDataFromCookie();

  if (!userData) {
    redirectToLogin(true);
    return;
  }

  var username = userData.username;
  var subdomain = 'quotes';

  checkAuthorization(username, subdomain)
    .then(function (isAuthorized) {
      if (isAuthorized) {
        var token = '3258xukj1pdvjerq7elfh19bc83mvzsi1bhozxox9thk7mscyvyyphud';
        var iframe = document.createElement('iframe');
        var iframeUrl = 'https://' + token + '-secure.yeahgames.net' + window.location.pathname;
        iframe.src = iframeUrl;
        iframe.style.width = '100%';
        iframe.style.height = '100%';

        iframe.addEventListener('load', function () {
          getTitle(iframeUrl)
            .then(function (iframeTitle) {
              document.title = iframeTitle;
              console.log('Retrieved protected page:', iframeTitle);

              // Add click event listener to the iframe content
              iframe.contentDocument.addEventListener('click', handleLinkClick);
            })
            .catch(function (error) {
              console.error('Error fetching title:', error);
            });
        });

        document.body.appendChild(iframe);
      } else {
        var errorIframe = document.createElement('iframe');
        errorIframe.src = 'https://www.yeahgames.net/errors/http/401';
        errorIframe.style.width = '100%';
        errorIframe.style.height = '100%';
        document.body.appendChild(errorIframe);
      }
    });
});