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
import Select from 'react-select';

class Main extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			isLoading: false,
			user: null,
			users: [],
			tasks: []
		};

		this.onRefreshClick = this.onRefreshClick.bind(this);
		this.selectUser = this.selectUser.bind(this);
	}

	async loadTasks(userId, forced = false) {
		let url = `${window.location.origin}/api/issues/${userId}`;

		if (forced === true) {
			url += '?forceUpdate=true';
		}

		return await fetch(url).then(response => response.json());
	}

	async loadUsers() {
		let url = `${window.location.origin}/api/users`;
		return await fetch(url).then(response => response.json());
	}

	async updatePage(userId, forced = false) {
		this.setState({
			isLoading: true
		});

		const response = await this.loadTasks(userId, forced);

		this.setState({
			isLoading: false,
			tasks: response.issues,
			user: response.user
		});
	}

	async getUsersList() {
		this.setState({
			isLoading: true
		});

		const response = await this.loadUsers();

		this.setState({
			isLoading: false,
			users: response.users.map(user => {
				return {
					label: user.lastname + ' ' + user.firstname,
					value: user
				};
			})
		})
	}

	selectUser({ value: user }) {
		this.setState({
			user
		});

		localStorage.setItem('user_id', user.id);

		this.updatePage(user.id);
	}

	componentDidMount() {
		const userId = localStorage.getItem('user_id');

		if (userId) {
			this.updatePage(userId);
		}
		else {
			this.getUsersList();
		}
	}

	onRefreshClick() {
		this.updatePage(this.state.user.id, true);
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
				) : (
					<div className="prioritizer-title">
						<div className="prioritizer-title__wrapper">
							<Typography variant="display1">
								Who are you?
							</Typography>
						</div>
					</div>
				)}

				{this.state.isLoading ?
					(
						<div className="prioritizer-loader">
							<CircularProgress color="secondary"/>
						</div>
					) :
					(
						this.state.user ? (
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
						) : (
							<div>
								<Select
									value={this.state.user}
									onChange={this.selectUser}
									options={this.state.users}
								/>
							</div>
						)
					)}
			</Paper>
		</div>;
	}
}

export default Main;
