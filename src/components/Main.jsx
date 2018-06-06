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
import Input from '@material-ui/core/Input';
import { withStyles } from '@material-ui/core/styles';
import MenuItem from '@material-ui/core/MenuItem';

import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import CancelIcon from '@material-ui/icons/Cancel';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import ClearIcon from '@material-ui/icons/Clear';
import HourglassEmpty from '@material-ui/icons/HourglassEmpty';
import Pause from '@material-ui/icons/Pause';
import Done from '@material-ui/icons/Done';

const statusIcons = {
	// Новый
	'1': '',
	// В разработке
	'2': '',
	// В работу
	'12': '',
	// На паузе
	'13': <Pause/>,
	// Ожидание
	'15': <HourglassEmpty/>,
	// Решен
	'3': <Done/>,
	// Протестирован
	'11': <Done/>
};

class Option extends React.Component {
	handleClick = event => {
		this.props.onSelect(this.props.option, event);
	};

	render() {
		const { children, isFocused, isSelected, onFocus } = this.props;

		return (
			<MenuItem
				onFocus={onFocus}
				selected={isFocused}
				onClick={this.handleClick}
				component="div"
				style={{
					fontWeight: isSelected ? 500 : 400,
				}}
			>
				{children}
			</MenuItem>
		);
	}
}

function SelectWrapped(props) {
	const { classes, ...other } = props;

	return (
		<Select
			optionComponent={Option}
			noResultsText={<Typography>{'No results found'}</Typography>}
			arrowRenderer={arrowProps => {
				return arrowProps.isOpen ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />;
			}}
			clearRenderer={() => <ClearIcon />}
			valueComponent={valueProps => {
				const { value, children, onRemove } = valueProps;

				const onDelete = event => {
					event.preventDefault();
					event.stopPropagation();
					onRemove(value);
				};

				if (onRemove) {
					return (
						<Chip
							tabIndex={-1}
							label={children}
							className={classes.chip}
							deleteIcon={<CancelIcon onTouchEnd={onDelete} />}
							onDelete={onDelete}
						/>
					);
				}

				return <div className="Select-value">{children}</div>;
			}}
			{...other}
		/>
	);
}

const ITEM_HEIGHT = 48;

const styles = theme => ({
	root: {
		flexGrow: 1,
		height: 250,
	},
	chip: {
		margin: theme.spacing.unit / 4,
	},
	// We had to use a lot of global selectors in order to style react-select.
	// We are waiting on https://github.com/JedWatson/react-select/issues/1679
	// to provide a much better implementation.
	// Also, we had to reset the default style injected by the library.
	'@global': {
		'.Select-control': {
			display: 'flex',
			alignItems: 'center',
			border: 0,
			height: 'auto',
			background: 'transparent',
			'&:hover': {
				boxShadow: 'none',
			},
		},
		'.Select-multi-value-wrapper': {
			flexGrow: 1,
			display: 'flex',
			flexWrap: 'wrap',
		},
		'.Select--multi .Select-input': {
			margin: 0,
		},
		'.Select.has-value.is-clearable.Select--single > .Select-control .Select-value': {
			padding: 0,
		},
		'.Select-noresults': {
			padding: theme.spacing.unit * 2,
		},
		'.Select-input': {
			display: 'inline-flex !important',
			padding: 0,
			height: 'auto',
		},
		'.Select-input input': {
			background: 'transparent',
			border: 0,
			padding: 0,
			cursor: 'default',
			display: 'inline-block',
			fontFamily: 'inherit',
			fontSize: 'inherit',
			margin: 0,
			outline: 0,
		},
		'.Select-placeholder, .Select--single .Select-value': {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			display: 'flex',
			alignItems: 'center',
			fontFamily: theme.typography.fontFamily,
			fontSize: theme.typography.pxToRem(16),
			padding: 0,
		},
		'.Select-placeholder': {
			opacity: 0.42,
			color: theme.palette.common.black,
		},
		'.Select-menu-outer': {
			backgroundColor: theme.palette.background.paper,
			boxShadow: theme.shadows[2],
			position: 'absolute',
			left: 0,
			top: `calc(100% + ${theme.spacing.unit}px)`,
			width: '100%',
			zIndex: 2,
			maxHeight: ITEM_HEIGHT * 8,
		},
		'.Select.is-focused:not(.is-open) > .Select-control': {
			boxShadow: 'none',
		},
		'.Select-menu': {
			maxHeight: ITEM_HEIGHT * 8,
			overflowY: 'auto',
		},
		'.Select-menu div': {
			boxSizing: 'content-box',
		},
		'.Select-arrow-zone, .Select-clear-zone': {
			color: theme.palette.action.active,
			cursor: 'pointer',
			height: 21,
			width: 21,
			zIndex: 1,
		},
		// Only for screen readers. We can't use display none.
		'.Select-aria-only': {
			position: 'absolute',
			overflow: 'hidden',
			clip: 'rect(0 0 0 0)',
			height: 1,
			width: 1,
			margin: -1,
		},
	},
});

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
		this.onChangeClick = this.onChangeClick.bind(this);
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

	selectUser(data) {
		this.setState({
			data
		});

		localStorage.setItem('user_id', data.id);

		this.updatePage(data.id);
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

	onChangeClick(event) {
		event.preventDefault();
		event.stopPropagation();

		this.getUsersList();

		this.setState({
			user: null
		});
	}

	getPhaseDeadline(task) {
		const deadline = task.custom_fields.find(field => field.id === 25);

		if (!deadline || !deadline.value) {
			return '—';
		}
		else {
			const deadlineDate = moment(deadline.value);
			const today = moment();
			console.log(today);
			const isUrgent = deadlineDate && (deadlineDate.isSame(today, 'day') || (deadlineDate.diff(today, 'days') < 2));

			return (
				<Typography>
					<span className={classnames('prioritizer-date', { 'prioritizer-date_urgent': isUrgent })}>
						{deadlineDate.format('DD.MM.YYYY')}
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
							{!this.state.isLoading ? (
								<span className="prioritizer-title__changeUser" onClick={this.onChangeClick}>
									<Typography>
										<a href="#">change</a>
									</Typography>
								</span>
							) : null}

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
					!this.state.isLoading ? (
						<div className="prioritizer-title">
							<div className="prioritizer-title__wrapper">
								<Typography variant="display1">
									Who are you?
								</Typography>
							</div>
						</div>
					) : null
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
										<TableCell>Project</TableCell>
										<TableCell>Status</TableCell>
										<TableCell>Subject</TableCell>
										<TableCell>Phase Deadline</TableCell>
									</TableRow>
								</TableHead>

								<TableBody>
									{this.state.tasks.map(task => (
										<TableRow key={task.id} className={classnames('prioritizer-row', {
											'prioritizer-row_inProgress': task.inProgress,
											'prioritizer-row_tested': task.tested,
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

											<TableCell className="prioritizer-cell prioritizer-cell_project">
												<Typography>
													{task.project.name}
												</Typography>
											</TableCell>

											<TableCell className="prioritizer-cell prioritizer-cell_tracker">
												<Typography>
													{task.tracker.name}
												</Typography>
											</TableCell>

											<TableCell className="prioritizer-cell prioritizer-cell_status">
												<div className="prioritizer-cell__wrapper">
													{statusIcons[task.status.id] ? statusIcons[task.status.id] : ''}

													<Typography>
														{task.status.name}
													</Typography>
												</div>
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
								<Input
									fullWidth
									inputComponent={SelectWrapped}
									value={this.state.user}
									onChange={this.selectUser}
									placeholder="Enter your name"
									id="react-select-single"
									autoFocus={true}
									inputProps={{
										classes: this.props.classes,
										name: 'react-select-single',
										instanceId: 'react-select-single',
										simpleValue: true,
										options: this.state.users,
									}}
								/>
							</div>
						)
					)}
			</Paper>
		</div>;
	}
}

export default withStyles(styles)(Main);
