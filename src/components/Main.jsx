import React from 'react';
import moment from 'moment';
import classnames from 'classnames';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import CircularProgress from '@material-ui/core/CircularProgress';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import RefreshIcon from '@material-ui/icons/Refresh';

class Main extends React.Component {
	constructor() {
		super();

		this.state = {
			isLoading: false,
			user: null,
			tasks: []
		};

		this.onRefreshClick = this.onRefreshClick.bind(this);
	}

	async loadTasks(forced = false) {
		const userId = window.location.search.replace('?user_id=', '');
		let url = `${window.location.origin}/api/issues/${userId}`;

		if (forced === true) {
			url += '?forceUpdate=true';
		}

		return await fetch(url).then(response => response.json());
	}

	updatePage(forced = false) {
		this.setState({
			isLoading: true
		});

		this.loadTasks(forced).then(response => this.setState({
			isLoading: false,
			tasks: response.issues,
			user: response.user
		}));
	}

	componentDidMount() {
		this.updatePage();
	}

	onRefreshClick() {
		this.updatePage(true);
	}

	getPhaseDeadline(task) {
		const deadline = task.custom_fields.find(field => field.id === 25);

		if (!deadline || !deadline.value) {
			return '—';
		}
		else {
			const isUrgent = moment(deadline.value).isSame(moment(), 'day') || (moment(deadline.value).diff(moment(), 'days') < 2);

			return (
				<Typography>
					<span className={classnames('prioritizer-date', { 'prioritizer-date_urgent': isUrgent })}>
						{deadline.value}
					</span>
				</Typography>
			);
		}
	}

	render() {
		return <div className="prioritizer">
			<Paper className="prioritizer__wrapper">
				{this.state.user ? (
					<div className="prioritizer-title">
						<div className="prioritizer-title__wrapper">
							<Typography variant="display1">
								{this.state.user.firstname} {this.state.user.lastname}
							</Typography>

							{!this.state.isLoading ? (
								<span className="prioritizer-title__icon" title="Refresh" onClick={this.onRefreshClick}>
									<RefreshIcon color="secondary"/>
								</span>
							) : null}
						</div>
					</div>
				) : null}

				{this.state.isLoading ?
					(
						<div className="prioritizer-loader">
							<CircularProgress color="secondary"/>
						</div>
					) :
					(
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>ID</TableCell>
									<TableCell>Type</TableCell>
									<TableCell>Status</TableCell>
									<TableCell>Subject</TableCell>
									<TableCell>Phase Deadline</TableCell>
								</TableRow>
							</TableHead>

							<TableBody>
								{this.state.tasks.map(task => (
									<TableRow key={task.id} className={classnames('prioritizer-row', {
										'prioritizer-row_inProgress': task.inProgress,
										'prioritizer-row_isBug': task.isBug,
										'prioritizer-row_needComment': task.needComment
									})}>
										<TableCell className="prioritizer-cell prioritizer-cell_id">
											<Typography>
												<a href={`http://helpdesk.nemo.travel/issues/${task.id}`} target="_blank">
													{task.id}
												</a>
											</Typography>
										</TableCell>

										<TableCell className="prioritizer-cell prioritizer-cell_tracker">
											<Typography>
												{task.tracker.name}
											</Typography>
										</TableCell>

										<TableCell className="prioritizer-cell prioritizer-cell_status">
											<Typography>
												{task.status.name}
											</Typography>
										</TableCell>

										<TableCell className="prioritizer-cell prioritizer-cell_subject">
											<Typography>
												<a href={`http://helpdesk.nemo.travel/issues/${task.id}`} target="_blank">
													{task.subject}
												</a>
											</Typography>
										</TableCell>

										<TableCell className="prioritizer-cell prioritizer-cell_date">
											{this.getPhaseDeadline(task)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
			</Paper>
		</div>;
	}
}

export default Main;
