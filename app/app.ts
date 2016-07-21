import * as perceptron from '@mattmazzola/perceptron';

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

export interface ILine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

export interface ICircle {
  x: number;
  y: number;
  r: number;
  color: string;
}

export class Chart {
  // Defaults
  width: number = 400;
  height: number = 400;
  paddingTop: number = 30;
  paddingRight: number = 30;
  paddingBottom: number = 30;
  paddingLeft: number = 30;

  xScale: any; //Function;
  yScale: any; //Function;

  circles: ICircle[] = [];
  containgElement: any;
  dragStartPoint: any = {
    id: 100,
    x: 0,
    y: 0,
    scaledX: 0,
    scaledY: 0
  };
  dragEndPoint: any = {
    x: 0,
    y: 0,
    scaledX: 0,
    scaledY: 0
  };
  dragBehavior: any;
  trainingLine: any = {
    slope: -1,
    offset: 0
  };
  svg: any;

  mode: boolean = true;

  constructor(selector: string, domain: [number, number], data: any[]) {
    this.containgElement = select(selector);

    // Inject svg
    this.svg = this.containgElement
      .append("svg")
      .attr("width", '100%')
      .attr("height", '100%');

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
      ;
    const yAxis = axisLeft(this.yScale);
    const yAxisGrid = axisLeft(this.yScale)
      .tickSize([this.width])
      ;

    // Draw Axises
    const xAxisGroup = this.svg
      .append('g')
      .attr('transform', `translate(0, ${(this.height)/2})`)
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

    // Register Events
    this.svg.on('click', (() => {
      const that = this;
      return function () {
        const [x,y] = mouse(this);
        console.log('new svg clicked');
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
    this.circles.length = 0;
    this.update();

    this.svg
      .selectAll('line')
      .remove('line')
  }

  toggleMode() {
    this.mode = !this.mode;

    if (!this.mode) {
      this.svg
        .call(this.dragBehavior);
    }
    else {
      this.svg.on('.drag', null);
    }
  }

  private addPoint(x: number, y: number) {
    const scaledCoordinates = {
      x: Math.round(this.xScale.invert(x)),
      y: Math.round(this.yScale.invert(y))
    };

    const newCircle: ICircle = {
      x: scaledCoordinates.x,
      y: scaledCoordinates.y,
      r: 5,
      color: 'blue'
    };

    this.circles.push(newCircle);
    this.update();
  }

  private dragStarted() {
    if (!this.mode) {
      const [x,y] = [event.x, event.y];
      this.dragStartPoint.x = x;
      this.dragStartPoint.scaledX = Math.round(this.xScale.invert(x));
      this.dragStartPoint.y = y;
      this.dragStartPoint.scaledY = Math.round(this.yScale.invert(y));
    }
  }

  private dragMove() {
    if (!this.mode) {
      const [x,y] = [event.x, event.y];
      const dragMovePoint = {
        x,
        y,
        scaledX: Math.round(this.xScale.invert(x)),
        scaledY: Math.round(this.yScale.invert(y))
      };

      let run: number;
      let rise: number;
      let slope: number;
      let offset: number;
      let minX: number = 0;
      let minY: number;
      let maxX: number = 400;
      let maxY: number;

      run = (dragMovePoint.x - this.dragStartPoint.x);
      rise = (dragMovePoint.y - this.dragStartPoint.y);

      if(run === 0) {
        slope = Infinity;
        offset = 0;
        minY = 0;
        minX = dragMovePoint.x,
        maxY = 400;
        maxX = dragMovePoint.x
      }
      else {
        slope = rise/run;
        offset = dragMovePoint.y - slope * dragMovePoint.x;

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

      const selection = this.svg
        .selectAll('line.division')
        .data([
          {
            id: -this.dragStartPoint.id,
            x1: minX,
            y1: minY,
            x2: maxX,
            y2: maxY,
            stroke: 'orange',
            strokeWidth: 2
          },
          {
            id: this.dragStartPoint.id,
            x1: this.dragStartPoint.x,
            y1: this.dragStartPoint.y,
            x2: dragMovePoint.x,
            y2: dragMovePoint.y,
            stroke: 'red',
            strokeWidth: 3
          },
        ], (d: any) => d.id);

      selection
        .enter()
          .append('line')
          .attr('x1', (d: ILine) => d.x1)
          .attr('y1', (d: ILine) => d.y1)
          .attr('x2', (d: ILine) => d.x2)
          .attr('y2', (d: ILine) => d.y2)
          .attr('stroke', (d: ILine) => d.stroke)
          .attr('stroke-width', (d: ILine) => d.strokeWidth)
          .classed('division', true)
        ;

      selection
        .attr('x1', (d: ILine) => d.x1)
        .attr('y1', (d: ILine) => d.y1)
        .attr('x2', (d: ILine) => d.x2)
        .attr('y2', (d: ILine) => d.y2)
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
      this.dragEndPoint.x = x;
      this.dragEndPoint.scaledX = Math.round(this.xScale.invert(x));
      this.dragEndPoint.y = y;
      this.dragEndPoint.scaledY = Math.round(this.yScale.invert(y));
    }
  }

  private update() {
    const selection = this.svg
      .selectAll('circle')
      .data(this.circles);

    selection
      .enter()
        .append("circle")
        .attr("cx", (d: ICircle) => this.xScale(d.x))
        .attr("cy", (d: ICircle) => this.yScale(d.y))
        .attr("r", (d: ICircle) => d.r)
        .style("fill", (d: ICircle) => d.color);

    selection
      .attr("cx", (d: ICircle) => this.xScale(d.x))
      .attr("cy", (d: ICircle) => this.yScale(d.y));

    selection
      .exit()
        .remove('circle');
  }

  public updateTrainingLine(slope: number, offset: number) {
    const minScaledX = this.xScale.invert(0);
    const maxScaledX = this.xScale.invert(400);
    let minX: number = this.xScale(minScaledX);
    let minY: number;
    let maxX: number = this.xScale(maxScaledX);
    let maxY: number;

    if(slope === Infinity) {
      minY = 0;
      minX = 0,
      maxY = 400;
      maxX = 400;
    }
    else {
      minY = this.yScale(slope * minScaledX + offset);
      maxY = this.yScale(slope * maxScaledX + offset);
    }

    const selection = this.svg
      .selectAll('line.train')
      .data([
        {
          id: 123,
          x1: minX,
          y1: minY,
          x2: maxX,
          y2: maxY,
          stroke: 'green',
          strokeWidth: 2
        }
      ], (d: any) => d.id);

      selection
        .enter()
          .append('line')
          .attr('x1', (d: ILine) => d.x1)
          .attr('y1', (d: ILine) => d.y1)
          .attr('x2', (d: ILine) => d.x2)
          .attr('y2', (d: ILine) => d.y2)
          .attr('stroke', (d: ILine) => d.stroke)
          .attr('stroke-width', (d: ILine) => d.strokeWidth)
          .classed('train', true)
        ;

      selection
        .attr('x1', (d: ILine) => d.x1)
        .attr('y1', (d: ILine) => d.y1)
        .attr('x2', (d: ILine) => d.x2)
        .attr('y2', (d: ILine) => d.y2)
        ;

      selection
        .exit()
          .remove('line')
          ;
  }
}


const vis = new Chart('.visual-container', [-50,50], []);

select('#reset')
  .on('click', () => {
    vis.reset();
  });

select("#mode")
  .on('click', () => {
    vis.toggleMode();
  });

select("#train")
  .on('click', () => {
    const slope = (Math.round(10 * Math.random()) - 5)/2;
    const offset = Math.round(40 * Math.random()) - 20;
    vis.updateTrainingLine(slope, offset);
  });
