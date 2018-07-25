var React = require('react');
var $ = jQuery = require('jquery');

class TeamList extends React.Component{

  constructor(props) {
    super(props);
    this.addTeam = this.addTeam.bind(this);
  }

  //tell the mainInterface to open a new team form
  addTeam () {
    this.props.openModal();
  }

  render () {
    if (this.props.whichPaneActive != 'teamsPane') {
      return null;
    }
    return(
      <div className="container">
        <ul className="collection">{this.props.teamList}</ul>
        <div className="fixed-action-btn btn-floating-div">
          <button className="btn-floating btn-large green tooltipped" data-position="left" data-tooltip="Add a team" onClick={this.addTeam}>
            <i className="large material-icons">add</i>
          </button>
        </div>
      </div>
    )
  }

}

module.exports=TeamList;
