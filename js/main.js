const container = document.querySelector('.animes-container');
const animePage = document.querySelector('.anime-page');
const showMoreBtn = document.querySelector('.show-more');
// Contains gender and sort forms
const sortForm = document.querySelector('.selector-sort');
const searchForm = document.querySelector('#search');
const searchBtn = document.querySelector('#searchBtn');
const heartBtn = document.querySelector('#favPageBtn');

// Keep record of the last sort keyword used, so that when the genre changes, it doesn't go back to Trending
let sort = 'TRENDING_DESC';
let inputAnimeName;
let prevScrollPos;
// Keep record of the favorite animes
let animeStorage = JSON.parse(localStorage.getItem('animeStorage')) || [];

/*
	Query for pages
	Query the api using the parameters: page, sort, genre, search
	Receive a page object(depending on its number), that has a media property which is an array of animes, each anime is an object that contains: id, title, image
	ex:
	{
		"data": {
			"Page": {
				"media": [
					{
						anime object
					},
					{
						anime object
					}
				]
			}
		}
	}
*/
let queryAllAnime = `
query($page: Int, $sort: [MediaSort], $genre: String, $search: String) {
  Page(page: $page) {
    media(sort: $sort, type:ANIME, genre: $genre, search: $search) {
      id
      title {
        romaji
        english
      }
      coverImage {
        large
      }
    }
  }
}`;

/*
	Get data from a specific anime using the anime id
	ex: 
	{
		"data": {
			"Media": {
				"id",
				"title": {
					
				},
				"episodes":,
				"starDate": {
					"year":
				},
				"description":,
				"duration":,
				"genres": [
				
				],
				"averageScore":,
				"coverImage": {
					"large":
				}
			}
		}
	}
*/
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

// Keep track of the page we are querying and the sort keyword, if necessary add search and genre
let variablesFoQuery = {
	page: 1,
	sort: sort,
};

window.onload = () => {
	// After the window finishes loading, add the event listeners
	showMoreBtn.addEventListener('click', loadMoreAnimes);
	sortForm.addEventListener('change', changeAnimeFilter);
	// When a key is pressed update the input of the search
	searchForm.addEventListener('keyup', typing);
	// Search anime when click on the search button
	searchBtn.addEventListener('click', submitSearch);
	container.addEventListener('click', openAnime);
	heartBtn.addEventListener('click', toggleFavPage);

	// Show trending animes when program starts
	queryAPI();
};

// If we don't pass any parameters to the function, use these values as default
// Query for anime data and pass it to the callback to display it
function queryAPI(
	query = queryAllAnime,
	variables = variablesFoQuery,
	callback = displayAllAnime
) {
	const url = 'https://graphql.anilist.co';
	// HTTP request details
	let options = {
		// Use POST to send a request body
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		// Send the variables to the API to select the necessary data, in the forme of a string
		body: JSON.stringify({
			query,
			variables,
		}),
	};

	// Make the request
	fetch(url, options)
		// receive the promise of data
		.then((data) => data.json())
		// Pass the data to the callback to display it
		.then(callback)
		.catch((error) => alert(`Something went wrong: ${error}`));
}

function displayAllAnime(animeData) {
	// Store the anime information from the API or from localStorage
	let animeArray;

	if (animeData.data != undefined) {
		// Show all animes we got from the API
		animeArray = animeData.data.Page.media;
	} else {
		// Show the animes saved as favorites on localStorage
		animeArray = animeData;
	}

	// Add content to the screen as a string of divs, each div containing an anime image and name, with the id associate to it
	// container += animeArray : if the container already has content, don't clear it, add after the content
	container.innerHTML += animeArray
		.map((anime) => {
			const title = replaceNullValues(anime.title.english, anime.title.romaji);

			// imgCover is to add the darker hover effect on the img, and since it's on top of the image, it contains the anime.id and we click on it
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
	// Store anime information from the API
	const anime = animeData.data.Media;
	// Replace any null values
	const title = replaceNullValues(anime.title.english, anime.title.romaji);
	const year = replaceNullValues(anime.startDate.year);
	const duration = replaceNullValues(anime.duration);
	const episodes = replaceNullValues(anime.episodes);
	const score = replaceNullValues(anime.averageScore);
	// Add a property to keep track if we saved the anime as favorite or not
	// Check if the anime is already saved as a favorite
	anime.isFav = checkIfFav(anime);
	// Select text based on the favorite status
	const buttonText = changeBtnText(anime);

	// Create a string with all the necessary anime information and add it to the page
	animePage.innerHTML += `
		<button id="closeBtn" class="icon no-outline cursor">
			<i class="fa fa-times"></i>
		</button>
		<div class="img-favBtn">
			<img src="${anime.coverImage.large}" alt="cover">
			<button class="favBtn no-outline cursor">${buttonText}</button>
		</div>
		<div class="info">
			<h2>${title}</h2>
			<p class="details">
				${year} <span>-</span> ${duration}min <span>-</span> ${episodes} episodes <span>-</span> ${score}/100 <span>-</span> ${anime.genres}
			</p>
			<p class="desc">${anime.description}</p>
		</div>`;

	// Add events to the closeBtn: close the anime page, and to favBtn: add/remove from favorites
	document.querySelector('.favBtn').addEventListener('click', (e) => {
		// Change favorite status
		toggleFav(anime);
		// Change button "Add to/Remove from favorite" text
		e.target.innerHTML = changeBtnText(anime);
	});
	document.querySelector('#closeBtn').addEventListener('click', closeAnimePage);

	// Show anime page and hide the animes page and showMore btn
	animePage.classList.add('active');
	container.classList.add('hide');
	showMoreBtn.classList.add('hide');

	// Start at the top of the page
	window.scrollTo(0, 0);
}

function replaceNullValues(propertyToCheck, replaceNull = 'N/A') {
	return propertyToCheck == null ? replaceNull : propertyToCheck;
}

function checkIfFav(anime) {
	// Set it to false
	let isFav = false;

	// Loop trough the animes on localStorage, and check if the id of the anime we opened matches the id of an anime saved
	// If it does, set isFav to true
	animeStorage.forEach((animeFromStorage) => {
		if (animeFromStorage.id == anime.id) {
			isFav = true;
		}
	});

	// Otherwise, return false
	return isFav;
}

function changeBtnText(anime) {
	if (anime.isFav) {
		return '<i class="fa fa-heart"></i>Remove from favorites';
	} else {
		return '<i class="fa fa-heart-o"></i>Add to favorites';
	}
}

function toggleFav(anime) {
	anime.isFav = !anime.isFav;

	if (anime.isFav) {
		const animeDataToStore = {
			id: anime.id,
			title: anime.title,
			coverImage: anime.coverImage,
			isFav: anime.isFav,
		};
		animeStorage.push(animeDataToStore);
	} else {
		animeStorage.forEach((animeFromStorage, index) => {
			if (animeFromStorage.id == anime.id) {
				animeStorage.splice(index, 1);
			}
		});
		container.innerHTML = '';
		displayAllAnime(animeStorage);
	}

	localStorage.setItem('animeStorage', JSON.stringify(animeStorage));
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
	if (heartBtn.firstElementChild.matches('.fa-heart-o')) {
		showMoreBtn.classList.remove('hide');
	}

	// Go back to where we were before opening an anime
	window.scrollTo(0, prevScrollPos);
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

function typing(e) {
	// Update the anime name input variable
	inputAnimeName = this.value;

	// Check if the key we pressed was enter
	const ENTER = 13;
	if (e.keyCode === ENTER) {
		// If the search box is empty, go to the home page; don't send the inputAnimeName to the api query
		if (inputAnimeName.length == 0) {
			deleteSearch();
		} else {
			// If the search box is not empty search for that anime
			submitSearch();
		}
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
