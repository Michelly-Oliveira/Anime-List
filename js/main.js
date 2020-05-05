const container = document.querySelector('.animes-container');
const animePage = document.querySelector('.anime-page');
const showMoreBtn = document.querySelector('.show-more');
// Contains gender and sort forms
const sortForm = document.querySelector('.selector-sort');
const searchForm = document.querySelector('#search');
const searchBtn = document.querySelector('#searchBtn');
const heartBtn = document.querySelector('#favPageBtn');

let closeBtn, favBtn;
// Keep record of the last sort keyword used, so that when the genre changes, it doesn't go back to Trending
let sort = 'TRENDING_DESC';
let inputAnimeName;

let prevScrollPos;

// Keep record of the favorite animes
let animeStorage = JSON.parse(localStorage.getItem('animeStorage')) || [];

// Query for pages:
// Get page info, anime: name, poster, genres, description, year, id
// Sort using: trending, popularity, title, oldest, newest
let queryAllAnime = `
query($page: Int, $sort: [MediaSort], $genre: String, $search: String) {
  Page(page: $page) {
    media(sort: $sort, type:ANIME, genre: $genre, search: $search) {
      id
      title {
        romaji
        english
        native
      }
      coverImage {
        large
      }
    }
  }
}`;

let querySelectedAnime = `
query($id: Int){
  Media(id: $id) {
    id
    title {
      romaji
      english
      native
    }
    episodes
    startDate {
      year
    }
    description
    duration
    genres
    averageScore
    coverImage {
      large
    }
  }
}
`;

let variablesFoQuery = {
	page: 1,
	sort: sort,
};

function queryAPI(
	queryInfo = queryAllAnime,
	variable = variablesFoQuery,
	callback = displayAllAnime
) {
	const url = 'https://graphql.anilist.co';
	// HTTP request details
	let options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		// Send the variables to the API to select the necessary data
		body: JSON.stringify({
			query: queryInfo,
			variables: variable,
		}),
	};

	fetch(url, options)
		.then((data) => data.json())
		.then(callback)
		.catch((error) => console.log(error));
}

function displayAllAnime(animeData) {
	let animeArray;
	if (animeData.data != undefined) {
		// Show animes after we query the API
		animeArray = animeData.data.Page.media;
	} else {
		// Show the animes saved as favorites
		animeArray = animeData;
	}

	container.innerHTML += animeArray
		.map((anime) => {
			const title =
				anime.title.english == null ? anime.title.romaji : anime.title.english;

			return `
      <div class="anime">
        <div class="imgCover cursor" data-id="${anime.id}"></div>
        <img src="${anime.coverImage.large}" alt="cover">
        <p>${title}</p>
      </div>`;
		})
		.join('');
}

function displayOneAnime(animeData) {
	// Make it easier to use the anime data
	const anime = animeData.data.Media;
	// Replace any null values
	const title =
		anime.title.english == null ? anime.title.romaji : anime.title.english;
	const year = anime.startDate.year == null ? '' : anime.startDate.year;
	const duration = anime.duration == null ? '0' : anime.duration;
	const episodes = anime.episodes == null ? '0' : anime.episodes;
	const score = anime.averageScore == null ? '0' : anime.averageScore;

	anime.isFav = checkIfFav(anime);
	// Select text based on the favorite status
	const button = changeBtnText(anime);

	// Create a string with all the necessary anime information and add it to the page
	animePage.innerHTML += `
    <button id="closeBtn" class="icon no-outline cursor"><i class="fa fa-times"></i></button>
    <div class="img-favBtn">
      <img src="${anime.coverImage.large}" alt="cover">
      <button class="favBtn no-outline cursor">${button}</button>
    </div>
    <div class="info">
      <h2>${title}</h2>
      <p class="details">${year} <span>-</span> ${duration}min <span>-</span> ${episodes} episodes <span>-</span> ${score}/100 <span>-</span> ${anime.genres}</p>
      <p class="desc">${anime.description}</p>
    </div>`;

	// When the user wants to close the specific anime
	closeBtn = document.querySelector('#closeBtn');
	favBtn = document.querySelector('.favBtn');
	closeBtn.addEventListener('click', closeAnimePage);
	favBtn.addEventListener('click', () => {
		// Change button "Add to/Remove from favorite" text
		toggleFav(anime);
	});

	// Show anime page and hide the animes page
	animePage.classList.add('active');
	container.classList.add('hide');
	showMoreBtn.classList.add('hide');

	window.scrollTo(0, 0);
}

function openAnime(e) {
	const element = e.target;
	prevScrollPos = window.pageYOffset;

	// Skip this if the click wasn't on the imgCover(on top of the img)
	if (!element.matches('.imgCover')) {
		return;
	}

	const animeId = {
		id: element.dataset.id,
	};

	queryAPI(querySelectedAnime, animeId, displayOneAnime);
}

function closeAnimePage() {
	// Clear the anime page
	animePage.innerHTML = '';

	animePage.classList.remove('active');
	container.classList.remove('hide');
	// If the previous page is the fav animes page
	if (heartBtn.firstChild.matches('.fa-heart-o')) {
		console.log('hey');
		showMoreBtn.classList.remove('hide');
	}

	// Go back to where we were before opening an anime
	window.scrollTo(0, prevScrollPos);
}

function checkIfFav(anime) {
	let isFav = false;

	animeStorage.forEach((animeFromStorage) => {
		if (animeFromStorage.id == anime.id) {
			isFav = true;
		}
	});

	return isFav;
}

function toggleFav(anime) {
	anime.isFav = !anime.isFav;

	const animeDataToStore = {
		id: anime.id,
		title: anime.title,
		coverImage: anime.coverImage,
		isFav: anime.isFav,
	};

	if (anime.isFav) {
		animeStorage.push(animeDataToStore);
	} else {
		animeStorage.forEach((animeFromStorage, index) => {
			if (animeFromStorage.id == animeDataToStore.id) {
				animeStorage.splice(index, 1);
			}
		});
		container.innerHTML = '';
		displayAllAnime(animeStorage);
	}

	favBtn.innerHTML = changeBtnText(anime);
	localStorage.setItem('animeStorage', JSON.stringify(animeStorage));
}

function changeBtnText(anime) {
	let btnText;

	if (anime.isFav) {
		btnText = '<i class="fa fa-heart"></i>Remove from favorites';
	} else {
		btnText = '<i class="fa fa-heart-o"></i>Add to favorites';
	}

	return btnText;
}

function loadMoreAnimes() {
	// Change the page
	variablesFoQuery.page++;
	// Show more animes
	queryAPI();
}

function changeAnimeFilter(e) {
	if (e.target.name == 'sort') {
		filterBySortType(e.target.value);
	} else if (e.target.name == 'genre') {
		filterByGenre(e.target.value);
	}

	refreshScreen();
}

function filterBySortType(sortKeyword) {
	switch (sortKeyword) {
		case 'trending':
			variablesFoQuery.sort = 'TRENDING_DESC';
			break;
		case 'popular':
			variablesFoQuery.sort = 'POPULARITY_DESC';
			break;
		case 'title':
			variablesFoQuery.sort = 'TITLE_ROMAJI';
			break;
		case 'oldest':
			variablesFoQuery.sort = 'START_DATE';
			break;
		case 'newest':
			variablesFoQuery.sort = 'START_DATE_DESC';
			break;
	}

	sort = variablesFoQuery.sort;
}

function filterByGenre(genre) {
	if (genre == 'all') {
		variablesFoQuery = {
			page: 1,
			sort: sort,
		};
	} else {
		variablesFoQuery = {
			page: 1,
			sort: sort,
			genre: genre,
		};
	}
}

function typing() {
	inputAnimeName = this.value;
	console.log(inputAnimeName);
}

function searchAnime(e) {
	inputAnimeName = this.value;

	// Just cleared the search box
	if (inputAnimeName.length == 0) {
		// Go back to home page
		deleteSearch();
	} else {
		// If we pressed enter
		submitSearch();
	}
}

function deleteSearch() {
	variablesFoQuery = {
		page: 1,
		sort: sort,
	};
	refreshScreen();
}

function submitSearch() {
	variablesFoQuery = {
		page: 1,
		sort: sort,
		search: inputAnimeName,
	};
	refreshScreen();
}

function refreshScreen() {
	// Clear the screen
	container.innerHTML = '';
	// Reset the page to 1
	variablesFoQuery.page = 1;
	// Show anime
	queryAPI();
}

function toggleFavPage(e) {
	const btn = e.target;

	if (btn.matches('.fa-heart')) {
		// Make heart empty
		btn.classList.remove('fa-heart');
		btn.classList.add('fa-heart-o');
		container.classList.remove('anime-fav-page');
		refreshScreen();
		showMoreBtn.classList.remove('hide');
	} else if (btn.matches('.fa-heart-o')) {
		// Make heart full
		btn.classList.add('fa-heart');
		btn.classList.remove('fa-heart-o');
		// Clear the screen
		container.innerHTML = '';
		container.classList.add('anime-fav-page');
		showMoreBtn.classList.add('hide');
		displayAllAnime(animeStorage);
	}
}

showMoreBtn.addEventListener('click', loadMoreAnimes);
sortForm.addEventListener('change', changeAnimeFilter);
searchForm.addEventListener('keyup', typing);
searchForm.addEventListener('search', searchAnime);
searchBtn.addEventListener('click', submitSearch);
container.addEventListener('click', openAnime);
heartBtn.addEventListener('click', toggleFavPage);

// Show trending animes when program starts
queryAPI();
