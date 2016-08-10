import {
  selectAll,
  select,
  mouse,
  event
} from 'd3-selection';

import {
  scaleLinear
} from 'd3-scale';

import {
  extent
} from "d3-array";

import {
  axisBottom,
  axisLeft
} from "d3-axis";

import {
  drag
} from "d3-drag";

import {
  brushX
} from "d3-brush";

export interface IEntity {
  id: (...args: any[]) => string;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface IScaledPoint {
  normal: IPoint;
  scaled: IPoint;
}

export interface ILine {
  start: IScaledPoint;
  end: IScaledPoint;
  userDefined: boolean;
}

export interface ILineEquation {
  slope: number;
  offset: number;
}

export interface ICircle extends IPoint {
  r: number;
  result: boolean;
}

export interface IModel {
  points: ICircle[];
  idealLine: ILine;
  trainingLines: ILine[];
}

export default class Chart {
  // Defaults
  width: number = 400;
  height: number = 500;
  brushHeight: number = 100;
  paddingTop: number = 30;
  paddingRight: number = 30;
  paddingBottom: number = 130;
  paddingLeft: number = 30;

  xScale: any; //Function;
  yScale: any; //Function;
  xAxisBrush: any;
  xAxisBrushGroup: any;

  brushPercentages: [number, number];

  model: IModel = {
    points: [],
    idealLine: {
      start: null,
      end: null,
      userDefined: true  
    },
    trainingLines: []
  };
  containgElement: any;
  idealLineStartPoint: IScaledPoint = {
    normal: {
      x: 0,
      y: 0
    },
    scaled: {
      x: 0,
      y: 0
    }
  };
  idealLineEndPoint: IScaledPoint = {
    normal: {
      x: 0,
      y: 0
    },
    scaled: {
      x: 0,
      y: 0
    }
  };
  dragMoveData: any = {
    slope: undefined,
    offset: undefined
  };
  dragStartPoint: IScaledPoint = {
    normal: {
      x: 0,
      y: 0
    },
    scaled: {
      x: 0,
      y: 0
    }
  };
  dragEndPoint: IScaledPoint = {
    normal: {
      x: 0,
      y: 0
    },
    scaled: {
      x: 0,
      y: 0
    }
  };
  dragBehavior: any;
  svg: any;
  brushSvg: any;
  mode: boolean = true;

  constructor(selector: string, domain: [number, number]) {
    this.containgElement = select(selector);

    // Inject svg
    this.svg = this.containgElement
      .append("svg")
      .attr("width", '100%')
      .attr("height", `${this.height - this.brushHeight}px`);

    this.brushSvg = this.containgElement
      .append("svg")
      .attr("width", '100%')
      .attr("height", `${this.brushHeight}px`)
      ;

    // Create scales mapping domain coordinates to svg coordinates
    this.xScale = scaleLinear()
      .domain(domain)
      .range([this.paddingLeft, this.width - this.paddingRight]);

    this.yScale = scaleLinear()
      .domain(domain)
      .range([this.height - this.paddingBottom, this.paddingTop]);

    // Create axises
    const xAxis = axisBottom(this.xScale);
    const xAxisGrid = axisBottom(this.xScale)
      .tickSize([this.width])
      .tickPadding(1000)
      ;
    const yAxis = axisLeft(this.yScale);
    const yAxisGrid = axisLeft(this.yScale)
      .tickSize([this.width])
      .tickPadding(1000)
      ;

    // Draw Axises
    const xAxisGroup = this.svg
      .append('g')
      .attr('transform', `translate(0, ${(this.height - this.brushHeight)/2})`)
      .classed('axis', true)
      .classed('axis--x', true)
      .classed('noselect', true)
      .call(xAxis);

    const xAxisGridGroup = this.svg
      .append('g')
      .attr('transform', `translate(0, 0)`)
      .classed('grid', true)
      .classed('grid--x', true)
      .classed('noselect', true)
      .call(xAxisGrid);

    const yAxisGroup = this.svg
      .append('g')
      .attr('transform', `translate(${this.width/2}, 0)`)
      .classed('axis', true)
      .classed('axis--y', true)
      .classed('noselect', true)
      .call(yAxis);
    
    const yAxisGridGroup = this.svg
      .append('g')
      .attr('transform', `translate(${this.width}, 0)`)
      .classed('grid', true)
      .classed('grid--y', true)
      .classed('noselect', true)
      .call(yAxisGrid);

    // Draw brush
    this.xAxisBrush = brushX()
      .extent([[0,0], [this.width-20,80]])
      .on("brush", () => this.brushed())
      ;

    this.xAxisBrushGroup = this.brushSvg
      .append('g')
      .attr('transform', `translate(10, 10)`)
      .classed('brush', true);
      ;

    this.xAxisBrushGroup
      .call(this.xAxisBrush);

    // Register Events
    this.svg.on('click', (() => {
      const that = this;
      return function () {
        const [x,y] = mouse(this);
        if (that.mode) {
          that.addPoint(x,y);
        }
      }
    })());

    this.dragBehavior = drag()
      .container(function() { return this; })
      .subject(function() { var p = [event.x, event.y]; return [p, p]; })
      .on("start", () => this.dragStarted())
      .on("drag", () => this.dragMove())
      .on("end", () => this.dragEnded());
  }

  reset() {
    // Reset points, ideal line, and training lines
    this.model.points.length = 0;
    this.model.trainingLines.length = 0;
    this.update(this.model);

    this.svg
      .selectAll('line.train')
      .remove('line');

    this.svg
      .selectAll('line.division')
      .remove('line')
  }

  setMode(mode: boolean) {
    if (this.mode !== mode) {
      this.mode = mode;

      if (!this.mode) {
        this.svg
          .call(this.dragBehavior);
      }
      else {
        this.svg.on('.drag', null);
      }
    }
  }

  private addPoint(x: number, y: number) {
    const scaledCoordinates: IPoint = {
      x: Math.round(this.xScale.invert(x)),
      y: Math.round(this.yScale.invert(y))
    };

    const newCircle: ICircle = {
      x: scaledCoordinates.x,
      y: scaledCoordinates.y,
      r: 5,
      result: null
    };

    this.model.points.push(newCircle);
    this.update(this.model);

    const customEvent = new CustomEvent("pointAdded", {
      detail: {
        x: newCircle.x,
        y: newCircle.y
      }
    });

    this.containgElement.node().dispatchEvent(customEvent);
  }

  private brushed() {
    const maxSize = this.width - 20;
    this.brushPercentages = <[number, number]>(<number[]>event.selection)
      .map(x => x / maxSize);

    console.log('brushed', event.selection, this.brushPercentages);
    this.update(this.model);
  }

  private dragStarted() {
    if (!this.mode) {
      const [x,y] = [event.x, event.y];
      this.dragStartPoint.normal.x = x;
      this.dragStartPoint.normal.y = y;
      this.dragStartPoint.scaled.x = Math.round(this.xScale.invert(x));
      this.dragStartPoint.scaled.y = Math.round(this.yScale.invert(y));
    }
  }

  private dragMove() {
    if (!this.mode) {
      const [x,y] = [event.x, event.y];
      const dragMovePoint: IScaledPoint = {
        normal: {
          x,
          y
        },
        scaled: {
          x: Math.round(this.xScale.invert(x)),
          y: Math.round(this.yScale.invert(y))
        }
      };

      let run: number;
      let rise: number;
      let slope: number;
      let offset: number;
      let minX: number = 0;
      let minY: number;
      let maxX: number = 400;
      let maxY: number;

      run = (dragMovePoint.normal.x - this.dragStartPoint.normal.x);
      rise = (dragMovePoint.normal.y - this.dragStartPoint.normal.y);

      if(run === 0) {
        slope = Infinity;
        offset = 0;
        minY = 0;
        minX = dragMovePoint.normal.x,
        maxY = 400;
        maxX = dragMovePoint.normal.x
      }
      else {
        slope = rise/run;
        offset = dragMovePoint.normal.y - slope * dragMovePoint.normal.x;

        minY = slope * (0) + offset;
        maxY = slope * 400 + offset;

        if (slope === 0) {
          minX = 0;
          maxX = 400;
        }
        else {
          minX = (minY - offset)/slope;
          maxX = (maxY - offset)/slope;
        }
      }

      this.dragMoveData.slope = -slope;
      this.dragMoveData.offset = dragMovePoint.scaled.y + slope * dragMovePoint.scaled.x;
      console.log(this.dragMoveData);

      const extendedLine: ILine = {
        start: {
          normal: {
            x: minX,
            y: minY
          },
          scaled: null
        },
        end: {
          normal: {
            x: maxX,
            y: maxY
          },
          scaled: null
        },
        userDefined: false
      };
      const userDefinedLine: ILine = {
        start: this.dragStartPoint,
        end: dragMovePoint,
        userDefined: true
      };

      const selection = this.svg
        .selectAll('line.division')
        .data([
          extendedLine,
          userDefinedLine,
        ]);

      selection
        .enter()
          .append('line')
          .attr('x1', (d: ILine) => d.start.normal.x)
          .attr('y1', (d: ILine) => d.start.normal.y)
          .attr('x2', (d: ILine) => d.end.normal.x)
          .attr('y2', (d: ILine) => d.end.normal.y)
          .classed('division', true)
          .classed('division--full', (d: ILine) => d.userDefined === false)
          .classed('division--user-defined', (d: ILine) => d.userDefined === true)
        ;

      selection
        .attr('x1', (d: ILine) => d.start.normal.x)
        .attr('y1', (d: ILine) => d.start.normal.y)
        .attr('x2', (d: ILine) => d.end.normal.x)
        .attr('y2', (d: ILine) => d.end.normal.y)
        ;

      selection
        .exit()
          .remove('line')
          ;
    }
  }

  private dragEnded() {
    if (!this.mode) {
      const [x,y] = [event.x, event.y];
      this.dragEndPoint.normal.x = x;
      this.dragEndPoint.normal.y = y;
      this.dragEndPoint.scaled.x = Math.round(this.xScale.invert(x));
      this.dragEndPoint.scaled.y = Math.round(this.yScale.invert(y));

      const differentStartPoint = (this.dragStartPoint.normal.x !== this.dragEndPoint.normal.x)
        || (this.dragEndPoint.normal.x !== this.dragEndPoint.normal.x)
        || (this.dragStartPoint.normal.y !== this.dragStartPoint.normal.y)
        || (this.dragEndPoint.normal.y !== this.dragEndPoint.normal.y)
        ;

      if (differentStartPoint) {
        // Start
        this.idealLineStartPoint.normal.x = this.dragStartPoint.normal.x;
        this.idealLineStartPoint.normal.y = this.dragStartPoint.normal.y;
        this.idealLineStartPoint.scaled.x = this.dragStartPoint.scaled.x;
        this.idealLineStartPoint.scaled.y = this.dragStartPoint.scaled.y;

        // End
        this.idealLineEndPoint.normal.x = this.dragEndPoint.normal.x;
        this.idealLineEndPoint.normal.y = this.dragEndPoint.normal.y;
        this.idealLineEndPoint.scaled.x = this.dragEndPoint.scaled.x;
        this.idealLineEndPoint.scaled.y = this.dragEndPoint.scaled.y;

        this.model.idealLine = {
          start: this.idealLineStartPoint,
          end: this.idealLineEndPoint,
          userDefined: true
        };

        const partionedPoints = this.model.points
          .map((d: ICircle) => {
            d.result = (this.crossProduct(this.idealLineStartPoint.scaled, this.idealLineEndPoint.scaled, d) > 0);
            return d;
          });
          
        const customEvent = new CustomEvent("idealLineUpdated", {
          detail: {
            x1: this.idealLineStartPoint.scaled.x,
            y1: this.idealLineStartPoint.scaled.y,
            x2: this.idealLineEndPoint.scaled.x,
            y2: this.idealLineEndPoint.scaled.y,
            slope: this.dragMoveData.slope,
            offset: this.dragMoveData.offset,
            points: partionedPoints
          }
        });
        this.containgElement.node().dispatchEvent(customEvent);
      }
    }
  }

  moveBrush(brushBoundaries: number[]) {
    this.xAxisBrush.move(this.xAxisBrushGroup, brushBoundaries);
  }

  private crossProduct(a: IPoint, b: IPoint, p: IPoint) {
    return ((b.x - a.x) * (p.y - a.y)) - ((b.y - a.y) * (p.x - a.x));
  }

  private update(model: IModel) {
    // Update Points
    const circlesSelection = this.svg
      .selectAll('circle')
      .data(this.model.points);

    circlesSelection
      .enter()
        .append("circle")
        .attr("cx", (d: ICircle) => this.xScale(d.x))
        .attr("cy", (d: ICircle) => this.yScale(d.y))
        .attr("r", (d: ICircle) => d.r)
        .classed('circle', true)
        .classed('circle--positive', (d: ICircle) => d.result === true)
        .classed('circle--negative', (d: ICircle) => d.result === false)
        ;

    circlesSelection
      .attr("cx", (d: ICircle) => this.xScale(d.x))
      .attr("cy", (d: ICircle) => this.yScale(d.y))
      .classed('circle--positive', (d: ICircle) => d.result === true)
      .classed('circle--negative', (d: ICircle) => d.result === false)
      ;

    circlesSelection
      .exit()
        .remove('circle')
        ;

    // Update training lines
    const trainingLinesSelection = this.svg
      .selectAll('line.train')
      .data(this.model.trainingLines.filter((d: ILine, i: number) => {
        const linePercentage = (i / this.model.trainingLines.length);

        return !this.brushPercentages || (
            linePercentage > this.brushPercentages[0]
            && linePercentage < this.brushPercentages[1]
        );
      }), (d: ILine) => `[(${d.start.normal.x}, ${d.start.normal.y}),(${d.end.normal.x}, ${d.end.normal.y})]`)
      ;

      trainingLinesSelection
        .enter()
          .append('line')
          .attr('x1', (d: ILine) => d.start.normal.x)
          .attr('y1', (d: ILine) => d.start.normal.y)
          .attr('x2', (d: ILine) => d.end.normal.x)
          .attr('y2', (d: ILine) => d.end.normal.y)
          .classed('train', true)
        ;

      trainingLinesSelection
        .attr('x1', (d: ILine) => d.start.normal.x)
        .attr('y1', (d: ILine) => d.start.normal.y)
        .attr('x2', (d: ILine) => d.end.normal.x)
        .attr('y2', (d: ILine) => d.end.normal.y)
        ;

      trainingLinesSelection
        .exit()
          .remove('line')
          ;
  }

  public setTrainingLines(trainingLines: ILineEquation[]) {
    const lines = trainingLines
      .map(line => this.convertSlopeOffsetToCoordinates(line.slope, line.offset));

    this.model.trainingLines = lines;
    this.update(this.model);
  }

  private convertSlopeOffsetToCoordinates(slope: number, offset: number): ILine {
    const minScaledX = this.xScale.invert(0);
    const maxScaledX = this.xScale.invert(this.width);
    let minX: number = this.xScale(minScaledX);
    let minY: number;
    let maxX: number = this.xScale(maxScaledX);
    let maxY: number;

    if(slope === Infinity) {
      minY = 0;
      minX = 0,
      maxY = this.height - this.brushHeight;
      maxX = this.width;
    }
    else {
      minY = this.yScale(slope * minScaledX + offset);
      maxY = this.yScale(slope * maxScaledX + offset);
    }

    return {
      start: {
        normal: {
          x: minX,
          y: minY
        },
        scaled: {
          x: this.xScale.invert(minX),
          y: this.yScale.invert(minY)  
        }
      },
      end: {
        normal: {
          x: maxX,
          y: maxY
        },
        scaled: {
          x: this.xScale.invert(maxX),
          y: this.yScale.invert(maxY)
        }
      },
      userDefined: false
    };
  }
}


const vis = new Chart('.visual-container', [-50,50]);

const trainingLines: ILineEquation[] = [];

$('#reset')
  .on('click', () => {
    vis.reset();
  });

let mode = true;
$("#mode")
  .on('click', () => {
    mode = !mode;
    vis.setMode(mode);
  });

$("#train")
  .on('click', () => {

    const maxLines = Math.round(50 * Math.random()) + 20;
    const trainingLines: ILineEquation[] = [];

    for (let i = 0; i < maxLines; i++) {
      const slope = (Math.round(10 * Math.random()) - 5)/2;
      const offset = Math.round(40 * Math.random()) - 20;
      const line: ILineEquation = {
        slope,
        offset
      };

      trainingLines.push(line);
    }

    vis.setTrainingLines(trainingLines);
  });

$('#brush')
  .on('click', () => {
    const randomLeft = Math.round(200 * Math.random());
    const randomRight = Math.round(150 * Math.random()) + 210;
    vis.moveBrush([randomLeft, randomRight]);
  });

const element = document.querySelector('.visual-container');
const $element = $('.visual-container');

$element
  .on('pointAdded', (event: JQueryEventObject) => {
    console.log('pointAdded', (<CustomEvent>(<any>event)).detail);
  });

element
  .addEventListener('idealLineUpdated', (event: CustomEvent) => {
    console.log('idealLineUpdated', event.detail);
  });

element
  .addEventListener('trainingLineUpdated', (event: CustomEvent) => {
    console.log('trainingLineUpdated', event.detail);
  });
