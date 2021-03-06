class Map {
  constructor(canvasHeight, canvasWidth, _resolution) {

    canvasHeight = Math.ceil(canvasHeight);
    canvasWidth = Math.ceil(canvasWidth);
    _resolution = Math.ceil(_resolution);


    const _rows = canvasHeight / _resolution;
    const _cols = canvasWidth / _resolution;
    this.rows = _rows;
    this.cols = _cols;
    this.areaRes = _resolution;
    this.areas = this.buildAreas(this.rows, this.cols, this.cellRes);
    this.areasArray = this.areas.flatMap(area => area);
    this.generation = 0;
  }

  // Creates an Area on the Map where it can hold Automata's
  buildAreas(rows, cols, cellRes) {
    let areas = new Array(rows);
    for (let row = 0; row < areas.length; row++) {
      areas[row] = new Array(cols);
      for (let col = 0; col < cols; col++) {
        areas[row][col] = new Area(row, col, this.areaRes, this);
      }
    }
    return areas;
  }

  getArea(row, col) {
    return this.areas[row][col];
  }

  // Returns an array containing all the areas on the map
  getAreas() {
    return this.areas.flatMap(area => area);
  }

  getRandomIndex() {
    const rRow = Math.floor(Math.random() * (this.rows + 1));
    const rCol = Math.floor(Math.random() * (this.cols + 1));
    return [rRow, rCol];
  }

  getRandomArea() {
    try {
      return this.getArea(...this.getRandomIndex());
    } catch(error) {
      console.log(error)
      return this.getRandomArea();
    }
  }

  getRandomAreaPopulation() {
    return this.getRandomArea().population;
  }

  // Populates a specific area with a given Automata
  populateArea(row, col, automata_type, automata_id, automata_properties) {
    const area = this.getArea(row, col);
    area.populate(automata_type, automata_id, automata_properties);
  }

  // Populates all the areas within the map with the given Automata
  populateMap(automata_type, automata_id, automata_properties) {
    this.areasArray.forEach(area => area.populate(automata_type, automata_id, automata_properties));
  }

  // Returns an array containing all the populations for each Area
  getPopulations() {
    return this.areasArray.map(area => area.population);
  }

  // Gives an array containing all the automata's in the Area for the given Row & Column.
  getAreaPopulation(row, col) {
    return this.getArea(row, col).population
  }

  // Clears all the cellular automata from the map
  clearMap() {
    this.areasArray.forEach(area => area.wipePopulation());
  }

  // Obtains the next generation for this map
  nextGeneration() {
    this.areasArray.forEach(area => area.evalArea());
    this.areasArray.forEach(area => area.setNextAreaStates());
    this.generation++;
  }

  // Renders all the areas located within this map
  render() {
    this.areasArray.forEach(area => area.renderArea());
  }
}

class Area {
  constructor(row, col, res, map) {
    this.rowIndex = row;
    this.colIndex = col;
    this.resolution = res;
    this.map = map
    this.population = new Array();
    this.neighbours = this.getNeighbours();
  }

  // Returns a matrix containing all the neighbouring cells (3x3)
  getNeighbours() {
    let neighbours = new Array();
    for (let i = -1; i < 2; i++) {
      for (let j = -1; j < 2; j++) {
        let row = (this.rowIndex + i + this.map.rows) % this.map.rows;
        let col = (this.colIndex + j + this.map.cols) % this.map.cols;
        if (row != this.rowIndex || col != this.colIndex) {
          neighbours.push([row,col])
        }
      }
    }
    return neighbours;
  }

  // TODO TEST THIS
  getNeighbourLocations(rowWindow = 1, colWindow = 1, reportSelf = false) {
    let neighbours = [];

    if (typeof rowWindow === 'boolean') {
      reportSelf = rowWindow;
      rowWindow = 1;
    }

    for (let i = -1*rowWindow; i <= rowWindow; i++) {
      let neighbourRow = []
      for (let j = -1*colWindow; j <= colWindow; j++) {

        const row = (this.rowIndex + i + this.map.rows) % this.map.rows;
        const col = (this.colIndex + j + this.map.cols) % this.map.cols;
        if (row != this.rowIndex || col != this.colIndex) {
          neighbourRow.push([row,col]);
        } else if (reportSelf) {
          neighbourRow.push("SELF");
        }
      }
      neighbours.push(neighbourRow);
    }
    return neighbours
  }

  // Returns the population of the neighbouring cells (3 * 3)
  getNeighbourPop() {
    let pop = [];
    this.neighbours.forEach(neighbourLoc => pop.push(this.map.getAreaPopulation(...neighbourLoc)), pop);
    return pop;
  }

  // Counts the N-neighbours that are identical to a given automata type (by default only active automata's)
  _countIdenticalNeighbours(automataId, activeOnly = true) {
    const neighbourCount = this.getNeighbourPop().reduce((identicalCount, automataArray) => {
      const filteredArray = automataArray.filter(automata => {
        if (activeOnly) {
          return automata.id === automataId && automata.state > 0;
        } else {
          return automata.id === automataId;
        }
      });
      return filteredArray.length + identicalCount;
    }, 0);
    return neighbourCount;
  }

  // Inserts an automata-type in this cell,  Automata  gets placed  infront of the population Array
  populate(automata, automata_id, automata_properties) {
    //TODO CELL CHECK
    this.population.unshift(new automata(this, automata_id, this.resolution, automata_properties));
  }

  // Clears the population of this area
  wipePopulation() {
    this.population.length = 0;
  }

  // Evaluates all the next states of the Automata's within the Area
  evalArea() {
    this.population.forEach(automata => automata.evalNextState());
  }

  // Sets all the next states for the Automata's within the Area
  setNextAreaStates() {
    this.population.forEach(automata => automata.setNextState())
  }

  // Calls the Render method on all automata's located in this area
  renderArea() {
    if (this.population.length > 0) {
      this.population.map(automata => {
        if (automata.state > 0) automata.renderAutomata();
      });
    }
  }
}

class Cell {
  constructor(area, cellId, _res = area.resolution, _properties = {color:[100,50,255], opacity: 255}) {
    this.area = area;
    this.id = cellId;
    this.row = area.rowIndex;
    this.col = area.colIndex;
    this.res = _res;
    this.props = _properties
    this.state = Math.round(Math.random());
    this.nextState;
  }
  setNextState() {
    this.state = this.nextState;
  }
  evalNextState() {
    let neighbours = this.area._countIdenticalNeighbours(this.id);
    if (this.state == 0 && neighbours == 3) {
      this.nextState = 1;
    } else if (this.state == 1 && (neighbours < 2 || neighbours > 3)) {
      this.nextState =  0;
    } else {
      this.nextState = this.state;
    }
  }
  renderAutomata() {
    if (this.state == 1) {
      fill(...this.props.color, this.props.opacity);
      stroke(0);
      rect(this.row * this.res, this.col * this.res, this.res-1, this.res-1);
    }
  }
}

let resolution = 80;
let board;

function setup() {
  createCanvas(1000, 1000);
  frameRate(10);
  map = new Map(1000, 1000, 10);
  // map.populateMap(Cell);
  map.populateMap(Cell, "cell-1", {color: [255,255,255], opacity:100});

  // map.populateMap(Cell2);
}

function draw() {
  background(0);
  map.nextGeneration();
  map.render();
}
