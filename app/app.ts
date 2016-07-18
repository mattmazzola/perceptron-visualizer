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

const data = [1,2,3,4];
const dataExtents = extent(data);
const chart = {
  width: 400,
  height: 400,
  paddingTop: 30,
  paddingRight: 30,
  paddingBottom: 30,
  paddingLeft: 30
};
console.log('dataExtents', dataExtents);

const scaleX = scaleLinear()
  .domain([-50, 50])
  .range([chart.paddingLeft, chart.width - chart.paddingRight]);

const scaleY = scaleLinear()
  .domain([-50, 50])
  .range([chart.height - chart.paddingBottom, chart.paddingTop]);

const axisX = axisBottom(scaleX);
const axisY = axisLeft(scaleY);

interface IEntity {
  id: number;
}

interface ILine extends IEntity {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
}

interface ICircle extends IEntity {
  x: number;
  y: number;
  r: number;
  color: string;
}
const circles: ICircle[] = [];
const container =  select(".visual-container");

let pointMode = false;
const modeButton = select("button.mode");
modeButton
  .on('click', modeButtonClicked);

function modeButtonClicked() {
  pointMode = !pointMode;
  console.log('mode button clicked', pointMode);
}

const svg = container
  .append("svg")
  .attr("width", '100%')
  .attr("height", '100%');

const axisXgroup = svg
  .append('g')
  .attr('transform', `translate(0, ${(chart.height)/2})`)
  .classed('axis', true)
  .classed('axis--x', true)
  .call(axisX);

const axisYGroup = svg
  .append('g')
  .attr('transform', `translate(${chart.width/2}, 0)`)
  .classed('axis', true)
  .classed('axis--y', true)
  .call(axisY);

function update() {
  svg
    .selectAll('circle')
    .data(circles)
    .enter()
      .append("circle")
      .attr("cx", (d: ICircle) => scaleX(d.x))
      .attr("cy", (d: ICircle) => scaleY(d.y))
      .attr("r", (d: ICircle) => d.r)
      .style("fill", (d: ICircle) => d.color);
}

update();

svg.on('click', function (event: any) {
  if(pointMode) {
    const [x,y] = mouse(this);
    addPoint(x,y);
  }
});

function addPoint(x: number, y: number) {
  const scaledCoordinates = {
    x: Math.round( scaleX.invert(x)),  // Takes the pixel number to convert to number
    y: Math.round( scaleY.invert(y))
  };

  const newCircle: ICircle = {
    id: Math.floor(Math.random() * 100),
    x: scaledCoordinates.x,
    y: scaledCoordinates.y,
    r: 5,
    color: 'red'
  };

  circles.push(newCircle);   // Push data to our array

  update();
}

const dragBehavior = drag()
  .container(function() { return this; })
  .subject(function() { var p = [event.x, event.y]; return [p, p]; })
  .on("start", dragstarted)
  .on("drag", dragmove)
  .on("end", dragended);

svg
    .call(dragBehavior);

let dragStartPoint = {
  id: 10,
  x: 0,
  y: 0,
  scaledX: 0,
  scaledY: 0
};

function dragstarted() {
  if (!pointMode) {
    const [x,y] = [event.x, event.y];
    dragStartPoint.id += 1;
    dragStartPoint.x = x;
    dragStartPoint.scaledX = Math.round(scaleX.invert(x));
    dragStartPoint.y = y;
    dragStartPoint.scaledY = Math.round(scaleY.invert(y)); 
  }
}

function dragmove() {
  if (!pointMode) {
    const [x,y] = [event.x, event.y];
    const dragMovePoint = {
      x,
      y,
      scaledX: Math.round(scaleX.invert(x)),
      scaledY: Math.round(scaleY.invert(y))
    };

    let run: number;
    let rise: number;
    let slope: number;
    let offset: number;
    let minX: number = 0;
    let minY: number;
    let maxX: number = 400;
    let maxY: number;

    run = (dragMovePoint.x - dragStartPoint.x);
    rise = (dragMovePoint.y - dragStartPoint.y);
    
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

    const selection = svg
        .selectAll('line')
        .data([
          {
            id: -dragStartPoint.id,
            x1: minX,
            y1: minY,
            x2: maxX,
            y2: maxY,
            stroke: 'orange',
            strokeWidth: 2
          },
          {
            id: dragStartPoint.id,
            x1: dragStartPoint.x,
            y1: dragStartPoint.y,
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

function dragended() {
  if (!pointMode) {
    const [x,y] = [event.x, event.y];
    const scaledCoordinates = {
      x: Math.round(scaleX.invert(x)),
      y: Math.round(scaleY.invert(y))
    };
  }
}

const playground = select('.playground')
  .selectAll('p')
  .data(data)
  .enter()
    .append('p')
    .text((d: string, i: number) => `Hello: ${d}, ${i}`);

const lines: ILine[] = [
  {
    id: 1,
    x1: 5,
    y1: 5,
    x2: 20,
    y2: 20,
    stroke: 'red',
    strokeWidth: 4
  },
  {
    id: 2,
    x1: 50,
    y1: 50,
    x2: 200,
    y2: 200,
    stroke: 'red',
    strokeWidth: 4
  }
];

svg
  .selectAll('line')
  .data(lines, (d: any) => d.id)
  .enter()
    .append('line')
    .attr('x1', (d: ILine) => d.x1)
    .attr('y1', (d: ILine) => d.y1)
    .attr('x2', (d: ILine) => d.x2)
    .attr('y2', (d: ILine) => d.y2)
    .attr('stroke', 'blue')
    .attr('stroke-width', 2)
    .classed('division', true)
    ;
