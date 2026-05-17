import { ButtonBuilder, ElementBuilder, MovieBuilder } from "./builders.js";

// Externalized message strings
const messages = {
  dataLoadError: 'Could not load data, status',
  movieAlreadyInCollection: 'Movie already in the collection.',
  addMovieFailed: 'Failed to add movie.',
  deleteMovieFailed: 'Failed to delete movie.',
  noResultsFound: 'No results found.',
  searchFailed: 'Search failed...',
  loggedOutGreeting: 'Please log in to view your movie collection.',
  loginFailed: 'Login failed'
};

let currentSession = null;

function updateGenres() {
  const header = document.querySelector('nav>h2');
  const listElement = document.querySelector("#filter");

  listElement.innerHTML = '';

  if (!currentSession) {
    header.style.display = 'none';
    return;
  }

  fetch("/genres")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(genres => {
      header.style.display = 'block';
      new ElementBuilder("li").append(new ButtonBuilder("All").onclick(() => loadMovies()))
        .appendTo(listElement);

      for (const genre of genres) {
        new ElementBuilder("li").append(new ButtonBuilder(genre).onclick(() => loadMovies(genre)))
          .appendTo(listElement);
      }

      const firstButton = listElement.querySelector("button");
      if (firstButton) {
        firstButton.click();
      }
    })
    .catch(error => {
      console.error('Failed to load genres:', error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function removeMovies() {
  const mainElement = document.querySelector("main");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function loadMovies(genre) {
  const url = new URL("/movies", location.href);
  if (genre) {
    url.searchParams.set("genre", genre);
  }

  fetch(url)
    .then(response => {
      removeMovies();
      const mainElement = document.querySelector("main");

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(movies => {
      const mainElement = document.querySelector("main");
      movies.forEach(movie => new MovieBuilder(movie, deleteMovie, Boolean(currentSession)).appendTo(mainElement));
    })
    .catch(error => {
      console.error('Failed to load movies:', error);
      const mainElement = document.querySelector("main");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function addMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: 'PUT' })
    .then(response => {
      if (response.status === 201) {
        // Remove from search results if present
        const resultElement = document.querySelector(`[data-imdb-id="${imdbID}"]`);
        if (resultElement) resultElement.remove();

        loadMovies();
        updateGenres();
      } else if (response.status === 200) {
        alert(messages.movieAlreadyInCollection);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to add movie:', error);
      alert(messages.addMovieFailed);
    });
}

function editMovie(id){
  location.href = 'edit.html?imdbID=' + id
}

function deleteMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: 'DELETE' })
    .then(response => {
      if (response.ok) {
        const article = document.getElementById(imdbID);
        if (article) {
          article.remove();
        }
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch(error => {
      console.error('Failed to delete movie:', error);
      alert(messages.deleteMovieFailed);
    });
}

function searchMovies(query) {
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(results => {
      const resultsDiv = document.getElementById("searchResults");
      resultsDiv.innerHTML = '';

      if (!results || results.length === 0) {
        new ElementBuilder("p").text(messages.noResultsFound).appendTo(resultsDiv);
        return;
      }

      const ul = document.createElement('ul');
      resultsDiv.appendChild(ul);
      for (const movie of results) {
        new ElementBuilder('li')
          .id(movie.imdbID)
          .append(new ElementBuilder('span').text(`${movie.Title} ${movie.Year ? '(' + movie.Year + ')' : ''}`))
          .append(new ButtonBuilder('Add').class("add-button").onclick(() => addMovie(movie.imdbID)))
          .appendTo(ul);
      }

    })
    .catch(error => {
      console.error('Search failed:', error);
      const resultsDiv = document.getElementById("searchResults");
      new ElementBuilder("p").text(messages.searchFailed).appendTo(resultsDiv);
    });
}

window.onload = function () {
  // Check session
  fetch("/session")
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(data => {
      currentSession = data || null;
      updateUI();
    })
    .catch(error => {
      console.error('Failed to load session:', error);
      currentSession = null;
      updateUI();
    });

  function renderUserGreeting() {
    const greetingElement = document.getElementById('userGreeting');
    if (currentSession) {
      const { firstName, lastName, loginTime } = currentSession;
      let loggedAt = '';
      try {
        const d = new Date(loginTime);
        const datePart = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
        const timePart = new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
        loggedAt = `${datePart} at ${timePart}`;
      } catch (err) {
        loggedAt = loginTime || '';
      }
      greetingElement.textContent = `Hi ${firstName} ${lastName}, you last logged in on ${loggedAt}.`;
    } else {
      greetingElement.textContent = messages.loggedOutGreeting;
    }
  }

  function updateUI() {
    const authBtn = document.getElementById('authBtn');
    const addMoviesBtn = document.getElementById('addMoviesBtn');

    renderUserGreeting();
    updateGenres();

    if (currentSession) {
      authBtn.textContent = 'Logout';
      authBtn.onclick = () => {
        fetch("/logout")
          .then(response => {
            if (response.ok) {
              currentSession = null;
              updateUI();
            }
          })
          .catch(error => {
            console.error('Logout failed:', error);
          });
      };
      addMoviesBtn.style.display = 'inline';
    } else {
      removeMovies();
      authBtn.textContent = 'Login';
      authBtn.onclick = () => {
        const loginForm = document.getElementById('loginForm');
        loginForm.reset();
        document.getElementById('loginDialog').showModal();
      };
      addMoviesBtn.style.display = 'none';
    }
  }

  // Login dialog
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const username = formData.get('username');
    const password = formData.get('password');

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(response => {
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('invalid-credentials');
          }
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        currentSession = data;
        document.getElementById('loginDialog').close();
        updateUI();
        loadMovies();
      })
      .catch(error => {
        console.error('Login failed:', error);
        if (error.message === 'invalid-credentials') {
          alert(messages.loginFailed);
        } else {
          alert(`${messages.loginFailed} ${error.message}`);
        }
      });

  });

  document.getElementById('cancelLogin').addEventListener('click', () => {
    document.getElementById('loginDialog').close();
  });

  // Search dialog
  document.getElementById('addMoviesBtn').addEventListener('click', () => {
    const searchForm = document.getElementById('searchForm');
    searchForm.reset();
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('searchDialog').showModal();
  });

  document.getElementById('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const query = document.getElementById('query').value;
    searchMovies(query);
  });

  document.getElementById('cancelSearch').addEventListener('click', () => {
    document.getElementById('searchDialog').close();
  });
};

