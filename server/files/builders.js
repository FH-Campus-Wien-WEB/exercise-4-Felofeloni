export class ElementBuilder {
  constructor(tag) {
    this.element = document.createElement(tag);
  }

  id(id) {
    this.element.dataset.imdbID = id;
    return this;
  }

  class(clazz) {
    this.element.classList.add(clazz);
    return this;
  }

  pluralizedText(content, array) {
    return this.text(array.length > 1 ? content + "s" : content);
  }

  text(content) {
    this.element.textContent = content;
    return this;
  }

  with(name, value) {
    this.element.setAttribute(name, value);
    return this;
  }

  listener(name, listener) {
    this.element.addEventListener(name, listener);
    return this;
  }

  append(child) {
    child.appendTo(this.element);
    return this;
  }

  appendTo(parent) {
    parent.append(this.element);
    return this.element;
  }

  insertBefore(parent, sibling) {
    parent.insertBefore(this.element, sibling);
    return this.element;
  }
}

export class ParentChildBuilder extends ElementBuilder {
  constructor(parentTag, childTag) {
    super(parentTag);
    this.childTag = childTag;
  }

  append(text) {
    const childCreator = new ElementBuilder(this.childTag).text(text);
    if (this.childClazz) {
      childCreator.class(this.childClazz);
    }

    super.append(childCreator);
  }

  childClass(childClazz) {
    this.childClazz = childClazz;
    return this;
  }

  items() {
    if (arguments.length === 1 && Array.isArray(arguments[0])) {
      arguments[0].forEach((item) => this.append(item));
    } else {
      for (var i = 0; i < arguments.length; i++) {
        this.append(arguments[i]);
      }
    }

    return this;
  }
}

class ParagraphBuilder extends ParentChildBuilder {
  constructor() {
    super("p", "span");
  }
}

class ListBuilder extends ParentChildBuilder {
  constructor() {
    super("ul", "li");
  }
}

function formatRuntime(runtime) {
  const hours = Math.trunc(runtime / 60);
  const minutes = runtime % 60;
  return hours + "h " + minutes + "m";
}

export class MovieBuilder extends ElementBuilder {
  constructor(movie, deleteMovie, isLoggedIn) {
    //Article
    super("article").id(movie.imdbID);

    //Poster
      const moviePoster = new ElementBuilder("img").with("src", movie.Poster);
      moviePoster.appendTo(this.element)

    //Content Container
    const movieContent = new ElementBuilder("div").class("content-container");
    const articleHeader = new ElementBuilder("div").class("article-header")
    articleHeader.appendTo(movieContent.element)
    const titleContainer = new ElementBuilder("div").class("title-container")
    titleContainer.appendTo(articleHeader.element)
    new ElementBuilder("h2").text(movie.Title).appendTo(titleContainer.element)
    new ElementBuilder("p").text(`Released: ${movie.Released} | Runtime: ${movie.Runtime} min | IMDb: ${movie.imdbRating} | Metascore: ${movie.Metascore}`).appendTo(articleHeader.element)

    const articleSide = new ElementBuilder("div").class("article-side")
    articleSide.appendTo(titleContainer.element)

    //Buttons
    if (isLoggedIn) {
      const editButton = new ElementBuilder("button").text("Edit").listener("click", () => {
                        location.href = "edit.html?imdbID=" + movie.imdbID
                    })
      editButton.appendTo(articleSide.element)
      const deleteButton = new ElementBuilder("button").text("Delete").listener("click", () => {
                        deleteMovie(movie.imdbID)
                    })
      deleteButton.appendTo(articleSide.element)
    }

    movieContent.append(generateTagsElement(movie.Genres))
        .append(new ElementBuilder("p").text(movie.Plot))
        .append(generateListElement("Directors", movie.Directors))
        .append(generateListElement("Writers", movie.Writers))
        .append(generateListElement("Actors", movie.Actors))       
    
    this.append(movieContent) 
  }
}

export class ButtonBuilder extends ElementBuilder {
  constructor(text) {
    super("button").with("type", "button").text(text)
  }

  onclick(handler) {
    return this.listener("click", handler)
  }
}

function generateListElement(listTitle, list){
  return new ElementBuilder("div")
    .append(new ElementBuilder("h3").text(listTitle))
    .append(
      new ParentChildBuilder("ul", "li").items(list)
    );
}

function generateTagsElement(list){
  const container = new ElementBuilder("div");

  for (const item of list) {
    container.append(
      new ElementBuilder("span")
        .class("genre-tag")
        .text(item)
    );
  }

  return container;
}