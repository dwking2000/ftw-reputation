import React, { Component } from 'react';
import ForceGraph3D from './3d/index';

class Graph extends Component {
  constructor(props) {
    super(props);

    this.myGraph = ForceGraph3D();

    this.props.graphAPIObj.updateTo = (data) => {
      console.log('ACTUALLLY to updating')
      console.log('ACTUALLLY to updating')
      console.log('ACTUALLLY to updating')
      console.log('ACTUALLLY to updating')
      console.log('ACTUALLLY to updating')
      console.log(data)
      this.myGraph.graphData(data);
    }
  }
  shouldComponentUpdate() {
    return false;
  }
  componentDidMount() {
    let container = document.getElementById('Graph__container');
    let data = {
        "nodes": [],
        "links": []
    };

    this.myGraph.width(container.offsetWidth)
    this.myGraph.height(container.offsetHeight)
    this.myGraph.linkOpacity(1)

    this.myGraph.linkColor('#ffffff')
    this.myGraph.backgroundColor('#000000');


    // this.myGraph.linkColor(() => {
    //   return '#000000'
    // })
    // this.myGraph.backgroundColor('#ffffff');

    this.myGraph.nodeResolution(24);
    this.myGraph(container);
    this.myGraph.graphData(data);
    this.myGraph.nodeRelSize(5)

    this.myGraph.nodeColor(node => {
      if (node.color) {
        return node.color;
      }
      return '#f00';
    })



      // setInterval(() => {
      //   this.myGraph.width(container.offsetWidth)
      //   this.myGraph.height(container.offsetHeight)

      //   // data.nodes.push({
      //   //   "id": 'a' + Math.random(),
      //   //   "name": 'a' + Math.random(),
      //   //   "val": 2
      //   // });


      //   // this.myGraph(container).graphData(data);
      // },1000)

    window.addEventListener("resize", function () {
      try {
        this.myGraph.width(container.offsetWidth)
        this.myGraph.height(container.offsetHeight)
      } catch(e) {

      }
    });

  }
  render() {

    return (
      <div className="Graph">
        <div id="Graph__container">

          D3 graph here
        </div>
      </div>
    );
  }
}

export default Graph;
