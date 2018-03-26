import React from 'react';
import moment from 'moment';
import classnames from 'classnames';
import Paper from 'material-ui/Paper';
import Typography from 'material-ui/Typography';
import Tooltip from 'material-ui/Tooltip';
import { CircularProgress } from 'material-ui/Progress';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';

class Main extends React.Component {
	constructor() {
		super();

		this.state = {
			isLoading: false,
			tasks: []
		};
	}

	async loadTasks() {
		const userId = window.location.search.replace('?user_id=', '');
		const response = await fetch(`http://192.168.0.51:7771/api/issues/${userId}`);

		return await response.json();
	}

	componentDidMount() {
		this.setState({
			isLoading: true
		});

		this.loadTasks().then(tasks => this.setState({
			isLoading: false,
			tasks
		}));
	}

	getPhaseDeadline(task) {
		const deadline = task.custom_fields.find(field => field.id === 25);

		if (!deadline || !deadline.value) {
			return '—';
		}
		else {
			const isUrgent = moment(deadline.value).isSame(moment(), 'day') || (moment(deadline.value).diff(moment(), 'days') < 2);

			let date = (
				<Typography>
					<span className={classnames('prioritizer-date', { 'prioritizer-date_urgent': isUrgent })}>
						{deadline.value}
					</span>
				</Typography>
			);

			if (isUrgent) {
				date = (
					<Tooltip title="Deadline is coming" placement="top">
						{date}
					</Tooltip>
				);
			}

			return date;
		}
	}

	render() {
		return <div className="prioritizer">
			<Paper className="prioritizer__wrapper">
				<div className="prioritizer-title">
					<Typography variant="display1" gutterBottom={true}>
						Tasks for today
					</Typography>
				</div>

				{
					this.state.isLoading ? (
						<div className="prioritizer-loader">
							<CircularProgress color="secondary"/>
						</div>
					) : (
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>ID</TableCell>
									<TableCell>Status</TableCell>
									<TableCell>Subject</TableCell>
									<TableCell>Phase Deadline</TableCell>
								</TableRow>
							</TableHead>

							<TableBody>
								{this.state.tasks.map(task => (
									<TableRow key={task.id}>
										<TableCell>
											<Typography>
												<a href={`http://helpdesk.nemo.travel/issues/${task.id}`} target="_blank">
													{task.id}
												</a>
											</Typography>
										</TableCell>

										<TableCell>
											<Typography>
												{task.status.name}
											</Typography>
										</TableCell>

										<TableCell>
											<Typography>
												<a href={`http://helpdesk.nemo.travel/issues/${task.id}`} target="_blank">
													{task.subject}
												</a>
											</Typography>
										</TableCell>

										<TableCell>
											{this.getPhaseDeadline(task)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)
				}
			</Paper>
		</div>;
	}
}

export default Main;
