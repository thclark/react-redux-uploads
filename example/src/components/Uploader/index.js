import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { FileDeleteButton, FileThumbnail, FileName, FileSize, FileStatus, Dropzone, Progress } from 'react-redux-uploader'

import RFUFileInput from 'react-fine-uploader/file-input'
import RFUThumbnail from 'react-fine-uploader/thumbnail'
import RFUCancelButton from 'react-fine-uploader/cancel-button'
import RFUDeleteButton from 'react-fine-uploader/delete-button'
import RFUFilename from 'react-fine-uploader/filename'
import RFUFilesize from 'react-fine-uploader/filesize'
import RFUPauseResumeButton from 'react-fine-uploader/pause-resume-button'
import RFUProgressBar from 'react-fine-uploader/progress-bar'
import RFURetryButton from 'react-fine-uploader/retry-button'
import RFUStatus from 'react-fine-uploader/status'
import RFUPauseIcon from 'react-fine-uploader/gallery/pause-icon'
import RFUPlayIcon from 'react-fine-uploader/gallery/play-icon'
import RFUXIcon from 'react-fine-uploader/gallery/x-icon'


// This is where we add styling and layout - in our own application, not in the uploader library.
// In this case, we just use reactstrap for bootstrap-styled components and react-table to list the files
import { Col, Row, Card, Input, InputGroup, InputGroupAddon, Button } from 'reactstrap'
import { Progress as ProgressBar } from 'reactstrap'

import ReactTable from 'react-table'


class MyFileProgressComponent extends Component {
  render() {
    console.log('MyFileProgressComponent rendering with props', this.props)
    return (
      // This receives a value prop (in percent) from the wrapper
      <ProgressBar {...this.props} />
    )
  }
}


class MyFileDeleteButtonComponent extends Component {
  render() {
    console.log('MyFileDeleteButtonComponent rendering with props', this.props)
    return (
      // This receives `disabled` and `onClick` props. See how I'm using reactstrap for the button, and font awesome for the icon?
      <Button {...this.props}>
        <i className="fa fa-trash" />
      </Button>
    )
  }
}

// This is just stuff for the table... don't worry about it
const stringFilter = ({ filter, onChange }) => (
  <InputGroup>
    <InputGroupAddon addonType="prepend">
      Filter
    </InputGroupAddon>
    <Input
      placeholder=""
      onChange={event => onChange(event.target.value)}
      value={filter ? filter.value : ''}
    />
  </InputGroup>
)
const stringFilterMethod = (filter, row) => {
  console.log('Filtering string', filter, row)
  return row[filter.id].includes(filter.value)
}
const isFileGone = (statusToCheck, statusEnum) => {
  console.log('Checking file presence', statusToCheck, statusEnum)
  return [
    statusEnum.CANCELED,
    statusEnum.DELETED,
  ].indexOf(statusToCheck) >= 0
}


class Uploader extends Component {
  constructor(props) {
    super(props)
    this.state = {
      visibleFiles: [],
    }

    const statusEnum = props.uploader.qq.status

    this.onStatusChange = (id, oldStatus, status) => {
      let visibleFiles = [...this.state.visibleFiles]

      if (status === statusEnum.SUBMITTED) {
        visibleFiles.push({ id })
        this.setState({ visibleFiles })
      } else if (isFileGone(status, statusEnum)) {
        this.removeVisibleFile(id)
      } else if (status === statusEnum.UPLOAD_SUCCESSFUL || status === statusEnum.UPLOAD_FAILED) {
        if (status === statusEnum.UPLOAD_SUCCESSFUL) {
          const visibleFileIndex = this.findFileIndex(id)
          if (visibleFileIndex < 0) {
            visibleFiles.push({ id, fromServer: true })
          }
        }
        this.updateVisibleFileStatus(id, status)
      }
    }
  }

  componentDidMount() {
    this.props.uploader.on('statusChange', this.onStatusChange)
  }

  componentWillUnmount() {
    this.props.uploader.off('statusChange', this.onStatusChange)
  }

  addFileToState(file) {
    let newData = [...this.state.visibleFiles]
    newData.splice(0, 1)
    console.log('Adding file to state', file)
    newData.push(file)
    this.setState({
      ...this.state,
      visibleFiles: newData,
    })
  }

  removeVisibleFile(id) {
    const visibleFileIndex = this.findFileIndex(id)
    if (visibleFileIndex >= 0) {
      const visibleFiles = [...this.state.visibleFiles]
      visibleFiles.splice(visibleFileIndex, 1)
      this.setState({ visibleFiles })
    }
  }

  updateVisibleFileStatus(id, status) {
    let newData = [...this.state.visibleFiles]
    let updated = false
    newData.some((file) => {
      if (file.id === id) {
        file.status = status
        updated = true
        return true
      }
      return false
    })
    if (updated) {
      this.setState({ visibleFiles: newData })
    }
  }

  findFileIndex(id) {
    let visibleFileIndex = -1
    this.state.visibleFiles.some((file, index) => {
      if (file.id === id) {
        visibleFileIndex = index
        return true
      }
      return false
    })
    return visibleFileIndex
  }

  render() {
    const uploader = this.props.uploader
    const chunkingEnabled = uploader.options.chunking && uploader.options.chunking.enabled
    const deleteEnabled = uploader.options.deleteFile && uploader.options.deleteFile.enabled
    const cancelButtonProps = { children: <RFUXIcon /> }
    const dropzoneProps = {
      disabled: false,
      multiple: true,
    }
    const fileInputProps = { multiple: true }
    const pauseResumeButtonProps = chunkingEnabled && {
      pauseChildren: <RFUPauseIcon />,
      resumeChildren: <RFUPlayIcon />,
    }
    const retryButtonProps = { children: <RFUPlayIcon /> }
    const thumbnailProps = { maxSize: 30 }

    const columns = [
      {
        Header: '',
        accessor: 'id',  // bodge to ensure id field is always in cell.row
        filterable: false,
        Cell: cell => (<FileThumbnail {...cell.row} uploader={uploader} {...thumbnailProps} />),
        maxWidth: 40,
      },
      {
        Header: 'Name',
        accessor: 'name',
        Cell: cell => (<FileName {...cell.row} uploader={uploader} />),
        filterMethod: stringFilterMethod,
        Filter: stringFilter,
      },
      {
        Header: 'Status',
        accessor: 'status',
        Cell: cell => (<FileStatus {...cell.row} uploader={uploader} />),
        sortMethod: null,
        filterMethod: (filter, row) => {
          const rowStatus = row.status ? row.status : 'queued'
          switch (filter.value) {
            case 'pending':
              return (
                (rowStatus === 'queued') || (rowStatus === 'canceled') || (rowStatus === 'paused') || (rowStatus === 'deleting')
              )
            case 'uploading':
              return (
                (rowStatus === 'retrying') || (rowStatus === 'submitting') || (rowStatus === 'uploading')
              )
            case 'complete':
              return (
                (rowStatus === 'upload successful')
              )
            case 'failed':
              return (
                (rowStatus === 'upload failed')
              )
            default:
              // The remaining (and default) option is to show all
              return true
          }
        },
        Filter: ({ filter, onChange }) => (
          <Input
            type="select"
            onChange={event => onChange(event.target.value)}
            value={filter ? filter.value : 'all'}
          >
            <option value="all">Show All</option>
            <option value="pending">Pending</option>
            <option value="uploading">Uploading</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </Input>
        ),
      },
      {
        Header: 'Size',
        accessor: 'size',
        filterable: false,
        Cell: cell => (<FileSize {...cell.row} uploader={uploader} />),
      },
      {
        Header: '',
        accessor: 'progress',
        filterable: false,
        Cell: cell => (
          <Progress {...cell.row} uploader={uploader}>
            <MyFileProgressComponent />
          </Progress>
        ),
        maxWidth: 100,
      },
      {
        Header: '',
        accessor: 'delete',
        filterable: false,
        Cell: cell => (
          <FileDeleteButton {...cell.row} uploader={uploader} onlyRenderIfDeletable={false}>
            <MyFileDeleteButtonComponent />
          </FileDeleteButton>
        ),
        maxWidth: 50,
      },
    ]

    console.log('re-rendering with visibleFiles', this.state.visibleFiles)
    return (
      <Row>
        <Col md={{ size: 3 }}>
          <Row>
            <Col>
              <Dropzone className="dropzone dropzone-panel-item" uploader={uploader} {...dropzoneProps} >
                <Row className="h-100">
                  <Col className="dropzone-content text-center">
                    <i className="fa fa-upload fa-lg" />
                    <p>Drop files/folders here </p>
                  </Col>
                </Row>
              </Dropzone>
            </Col>
          </Row>
          <Row>
            <Col>
              <RFUFileInput className="btn btn-danger dropzone-panel-item" uploader={uploader} {...fileInputProps} >
                <span>
                  <i className="fa fa-upload" /> Select Files
                </span>
              </RFUFileInput>
            </Col>
          </Row>
        </Col>
        <Col md={{ size: 9 }}>
          <Card className="file-table-panel">
            <ReactTable
              data={this.state.visibleFiles}
              columns={columns}
              minRows={5}
              defaultPageSize={10}
              filterable
              className="-highlight"
            />
          </Card>

                  {/*<PauseResumeButton className='react-fine-uploader-gallery-pause-resume-button'*/}
                                     {/*id={ id }*/}
                                     {/*uploader={ uploader }*/}
                                     {/*{ ...pauseResumeButtonProps }*/}

          <RFUProgressBar className="" uploader={uploader} />
        </Col>

      </Row>
    )
  }
}


Uploader.propTypes = {
  uploader: PropTypes.object.isRequired,
}


export default Uploader
